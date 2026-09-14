import { Extension } from '@tiptap/core'
import { EditorState, Plugin, PluginKey, TextSelection, Transaction } from '@tiptap/pm/state'
import { getOwnProperty } from '@tldraw/editor'

// The pairs we know how to wrap a selection in, as `[opening, closing]`. Most are symmetrical, but
// the Spanish and interrobang ones open and close with different characters.
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
	['⟨', '⟩'],
	['⟦', '⟧'],
	// CJK
	['「', '」'], // corner quotes
	['『', '』'], // nested corner quotes
	['〈', '〉'],
	['《', '》'], // title marks
	['〔', '〕'], // tortoise shell
	['〘', '〙'],
	['【', '】'], // lenticular
	['〖', '〗'],
	// Fullwidth forms, used alongside CJK text
	['（', '）'],
	['［', '］'],
	['｛', '｝'],
	['＜', '＞'],
	['｟', '｠'],
	// Editorial and epigraphic brackets, for quoted or partially legible source text
	['⁅', '⁆'],
	['⸢', '⸣'],
	['⸤', '⸥'],
	// Spanish, and the inverted interrobang
	['¡', '!'],
	['¿', '?'],
	['⸘', '‽'],
] as const

/**
 * The pairs the selection gets wrapped in, keyed by the character you type: with `hello` selected,
 * typing `(` gives `(hello)` and typing `¡` gives `¡hello!`.
 *
 * A straight quote wraps in the curly pair, because {@link https://tiptap.dev/docs/editor/extensions/functionality/typography | Typography}
 * turns a typed `"` into `“` or `”` anyway. Pass your own `pairs` to {@link WrapSelectionExtension}
 * to wrap in straight quotes instead, or to add pairs of your own.
 *
 * @public
 */
export const defaultWrappingPairs: Record<string, readonly [string, string]> = {
	...Object.fromEntries(WRAPPING_PAIRS.map((pair) => [pair[0], pair])),
	'"': ['“', '”'],
	"'": ['‘', '’'],
}

/** @public */
export interface WrapSelectionOptions {
	/**
	 * The `[opening, closing]` pair to wrap the selection in, keyed by the character typed.
	 * Defaults to {@link defaultWrappingPairs}.
	 */
	pairs: Record<string, readonly [string, string]>
}

/**
 * The transaction that wraps the range in the pair `text` maps to, or null if this input isn't one
 * we wrap with.
 *
 * @internal
 */
export function getWrapSelectionTransaction(
	state: EditorState,
	from: number,
	to: number,
	text: string,
	pairs: WrapSelectionOptions['pairs']
): Transaction | null {
	// With no selection there's nothing to wrap, so the character types as itself.
	if (from === to) return null

	const pair = getOwnProperty(pairs, text)
	if (!pair) return null
	const [opening, closing] = pair

	const $from = state.doc.resolve(from)
	const $to = state.doc.resolve(to)
	if (!$from.parent.isTextblock || !$to.parent.isTextblock) return null

	// Inside code every character is literal: typing over a selection should replace it, and a
	// curly quote would be wrong. TipTap's input rules bail on code for the same reason.
	if ($from.parent.type.spec.code) return null
	if ($from.nodeAfter?.marks.some((mark) => mark.type.spec.code)) return null

	// The delimiters take only the marks that run the whole length of the selection, so wrapping a
	// bold word gives bold brackets but wrapping a plain word next to a bold one doesn't.
	const marks = $from.marksAcross($to)

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
 * press `¡`, and you get `¡hello!`. See {@link defaultWrappingPairs} for the pairs, which can be
 * replaced or extended through the extension's `pairs` option.
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
						if (view.composing) return false
						const tr = getWrapSelectionTransaction(view.state, from, to, text, pairs)
						if (!tr) return false
						view.dispatch(tr)
						return true
					},
				},
			}),
		]
	},
})
