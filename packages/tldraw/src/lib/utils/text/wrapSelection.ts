import { Extension } from '@tiptap/core'
import { Mark, Node } from '@tiptap/pm/model'
import {
	AllSelection,
	EditorState,
	Plugin,
	PluginKey,
	Selection,
	TextSelection,
	Transaction,
} from '@tiptap/pm/state'
import { getOwnProperty } from '@tldraw/editor'
import { isMonospace, isStraightQuote } from './literalTyping'

// The pairs we know how to wrap a selection in, as `[opening, closing]`.
const WRAPPING_PAIRS = [
	// Quotes
	['‘', '’'],
	['“', '”'],
	['‹', '›'], // nested, French and Swiss
	['«', '»'], // French, Russian, Spanish, Greek
	['„', '”'], // Polish, Romanian, Hungarian
	['‚', '’'], // nested, German and Polish
	['`', '`'],
	// Brackets
	['(', ')'],
	['[', ']'],
	['{', '}'],
	['<', '>'],
	// CJK
	['「', '」'], // corner quotes
	['『', '』'], // nested corner quotes
	['《', '》'], // title marks
	['【', '】'], // lenticular
	// Fullwidth forms, used alongside CJK text
	['（', '）'],
	['［', '］'],
	['｛', '｝'],
	['＜', '＞'],
	// Spanish
	['¡', '!'],
	['¿', '?'],
] as const

/**
 * The pairs the selection gets wrapped in, keyed by the character you type: with `hello` selected,
 * typing `(` gives `(hello)` and typing `¡` gives `¡hello!`.
 *
 * Either half of a pair wraps in the whole pair. `¡` and `¿` are out of reach on most keyboard
 * layouts, so typing the `!` or `?` that closes them has to work too.
 *
 * A straight quote wraps in the curly pair, because {@link https://tiptap.dev/docs/editor/extensions/functionality/typography | Typography}
 * turns a typed `"` into `“` or `”` anyway. Inside code or monospace text it wraps in straight
 * quotes. Pass your own `pairs` to {@link WrapSelectionExtension} to wrap in straight quotes
 * everywhere, or to add pairs of your own.
 *
 * @public
 */
export const defaultWrappingPairs: Record<string, readonly [string, string]> = {
	// Closing characters first, so an opening one wins any character the two sides share, and in
	// reverse so that of two pairs closed by the same character — `”` closes `“ ”` and `„ ”` — the
	// one listed first wins.
	...Object.fromEntries([...WRAPPING_PAIRS].reverse().map((pair) => [pair[1], pair])),
	...Object.fromEntries(WRAPPING_PAIRS.map((pair) => [pair[0], pair])),
	'"': ['“', '”'],
	"'": ['‘', '’'],
}

/**
 * Options for {@link WrapSelectionExtension}.
 *
 * @public
 */
export interface WrapSelectionOptions {
	/**
	 * The `[opening, closing]` pair to wrap the selection in, keyed by the character typed.
	 * Defaults to {@link defaultWrappingPairs}.
	 */
	pairs: Record<string, readonly [string, string]>
}

/**
 * The marks every inline node in the range carries, or null if the range holds no inline content at
 * all — a selection of nothing but a block boundary, which there is no sense wrapping.
 */
function getMarksSpanningRange(doc: Node, from: number, to: number): readonly Mark[] | null {
	let marks: readonly Mark[] | null = null as readonly Mark[] | null
	doc.nodesBetween(from, to, (node) => {
		if (!node.isInline) return
		marks = marks ? marks.filter((mark) => mark.isInSet(node.marks)) : node.marks
	})
	return marks
}

function isCodeMark(mark: Mark) {
	return !!mark.type.spec.code
}

/**
 * The transaction that wraps the range in the pair `text` maps to, or null if this input isn't one
 * we wrap with.
 */
function getWrapSelectionTransaction(
	state: EditorState,
	from: number,
	to: number,
	text: string,
	pairs: WrapSelectionOptions['pairs'],
	isMonospace: boolean
): Transaction | null {
	if (from === to) return null

	// A backtick marks the selection as code, the way a closing backtick does to typed text, rather
	// than wrapping it in literal backticks. A schema without a code mark falls back to `pairs`.
	const codeMark = text === '`' ? state.schema.marks.code : undefined
	const pair = getOwnProperty(pairs, text)
	if (!codeMark && !pair) return null

	// Retyping a character over a selection of that same character leaves the DOM untouched, which
	// prosemirror-view reports as an input of the selected text itself. Wrapping it would turn a
	// selected `(` into `(()`.
	if (state.doc.textBetween(from, to) === text) return null

	// Select-all hands us an AllSelection, whose ends sit outside any text block. Without this it
	// declines, and select-all then `(` would replace the text that drag-selecting it wraps.
	if (state.selection instanceof AllSelection && from === 0 && to === state.doc.content.size) {
		from = Selection.atStart(state.doc).from
		to = Selection.atEnd(state.doc).to
	}

	const $from = state.doc.resolve(from)
	const $to = state.doc.resolve(to)
	if (!$from.parent.isTextblock || !$to.parent.isTextblock) return null

	// Marks common to the whole selection, so wrapping a bold word gives bold brackets while a
	// selection that starts bold and ends plain gets plain ones. Taking the marks at `from` alone
	// (what `marksAcross` returns) would leave a stray bold — or, worse, separately linked —
	// closing character at the end.
	const marks = getMarksSpanningRange(state.doc, from, to)
	if (!marks) return null

	if (codeMark) {
		// Toggles, so a backtick over code that's all code turns it back into plain text.
		const tr = codeMark.isInSet(marks)
			? state.tr.removeMark(from, to, codeMark)
			: state.tr.addMark(from, to, codeMark.create())
		return tr.scrollIntoView()
	}
	if (!pair) return null

	const isCode =
		marks.some(isCodeMark) || ($from.parent === $to.parent && !!$from.parent.type.spec.code)
	// A selection running from plain text into code, or out of it, would drop an unmarked delimiter
	// inside the code run and split it in two, so it's replaced as usual instead.
	if (
		!isCode &&
		($from.parent.type.spec.code ||
			$to.parent.type.spec.code ||
			$from.nodeAfter?.marks.some(isCodeMark) ||
			$to.nodeBefore?.marks.some(isCodeMark))
	) {
		return null
	}

	// Code is literal and curly quotes look out of place in monospace text, so there a straight quote
	// wraps in straight quotes.
	const [opening, closing] = (isCode || isMonospace) && isStraightQuote(text) ? [text, text] : pair

	const tr = state.tr
	// Closing first: inserting at `from` would shift `to` out from under us.
	tr.insert(to, state.schema.text(closing, marks))
	tr.insert(from, state.schema.text(opening, marks))
	// Leave the original text selected, so wraps can be stacked: «hello» then „«hello»”.
	tr.setSelection(TextSelection.create(tr.doc, from + opening.length, to + opening.length))

	return tr.scrollIntoView()
}

/**
 * Wraps the selected text in a pair of matching characters instead of replacing it: select `hello`,
 * press `¡` or `!`, and you get `¡hello!`. See {@link defaultWrappingPairs} for the pairs, which
 * can be replaced or extended through the extension's `pairs` option.
 *
 * A backtick is the exception: it toggles the `code` mark on the selection instead, when the schema
 * has one.
 *
 * @public
 */
export const WrapSelectionExtension = Extension.create<WrapSelectionOptions>({
	name: 'wrapSelection',

	// Input rules also run on a non-empty selection, and they run in extension priority order.
	// Without a priority above theirs, Typography's smart quote rule would get there first and
	// replace the selected text with a lone `“`.
	priority: 1000,

	addOptions() {
		return { pairs: defaultWrappingPairs }
	},

	addProseMirrorPlugins() {
		const { pairs } = this.options
		return [
			new Plugin({
				key: new PluginKey('wrapSelection'),
				props: {
					handleTextInput(view, from, to, text) {
						// Mid-composition the range is the IME's own text, not something the user selected.
						if (view.composing) return false
						const tr = getWrapSelectionTransaction(
							view.state,
							from,
							to,
							text,
							pairs,
							from !== to && isStraightQuote(text) && isMonospace(view)
						)
						if (!tr) return false
						view.dispatch(tr)
						return true
					},
				},
			}),
		]
	},
})
