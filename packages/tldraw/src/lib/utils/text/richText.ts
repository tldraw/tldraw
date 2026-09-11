import {
	Extension,
	Extensions,
	extensions,
	generateHTML,
	generateJSON,
	getSchema,
	getTextBetween,
	getTextSerializersFromSchema,
	JSONContent,
	Range,
	TextSerializer,
} from '@tiptap/core'
import { Code } from '@tiptap/extension-code'
import { Highlight } from '@tiptap/extension-highlight'
import { Node } from '@tiptap/pm/model'
import { EditorState } from '@tiptap/pm/state'
import { StarterKit, type StarterKitOptions } from '@tiptap/starter-kit'
import {
	Editor,
	getOwnProperty,
	RichTextFontVisitorState,
	TLFontFace,
	TLRichText,
	WeakCache,
} from '@tldraw/editor'
import { DefaultFontFaces } from '../../shapes/shared/defaultFonts'

/** @public */
export const KeyboardShiftEnterTweakExtension = Extension.create({
	name: 'keyboardShiftEnterHandler',
	addKeyboardShortcuts() {
		return {
			// We don't support soft breaks, so we just use the default enter command.
			'Shift-Enter': ({ editor }) => editor.commands.enter(),
		}
	},
})

// We change the default Code to override what's in the StarterKit.
// It allows for other attributes/extensions.
// @ts-ignore this is fine.
Code.config.excludes = undefined

// We want the highlighting to take precedence over bolding/italics/links
// as far as rendering is concerned. Otherwise, the highlighting
// looks broken up.
Highlight.config.priority = 1100

/**
 * Build tldraw's default TipTap extension set, optionally overriding the bundled `StarterKit`
 * options. The one lever most consumers want is turning individual nodes off (e.g. comments use a
 * headingless set via `getTipTapDefaultExtensions({ heading: false })`); because `StarterKit` is a
 * single umbrella extension, its sub-extensions can only be disabled through its config, not by
 * filtering the returned array.
 *
 * @public
 */
export function getTipTapDefaultExtensions(
	starterKitOptions?: Partial<StarterKitOptions>
): Extensions {
	return [
		StarterKit.configure({
			blockquote: false,
			codeBlock: false,
			horizontalRule: false,
			link: {
				openOnClick: false,
				autolink: true,
				// The link editor prefixes a bare address with `https://`, so autolinking a typed one
				// must do the same rather than tiptap's `http` default.
				defaultProtocol: 'https',
			},
			// Prevent trailing paragraph insertion after lists (fixes #7641)
			trailingNode: {
				notAfter: ['paragraph', 'bulletList', 'orderedList', 'listItem'],
			},
			...starterKitOptions,
		}),
		Highlight,
		KeyboardShiftEnterTweakExtension,

		// N.B. We disable the text direction core extension in RichTextArea,
		// but we add it back in again here in our own extensions list so that
		// people can omit/override it if they want to.
		extensions.TextDirection.configure({ direction: 'auto' }),
	]
}

/**
 * Default extensions for the TipTap editor.
 *
 * @public
 */
export const tipTapDefaultExtensions: Extensions = getTipTapDefaultExtensions()

// todo: bust this if the editor changes, too
const htmlCache = new WeakCache<TLRichText, string>()

/**
 * Renders HTML from a rich text string using an explicit set of TipTap extensions, rather than the
 * ones configured on an editor. Use this when rendering rich text outside of a shape's editor
 * config (e.g. comments, which render through their own headingless extension set).
 *
 * @param richText - The rich text content.
 * @param extensions - The TipTap extensions to render with.
 *
 * @public
 */
export function renderHtmlFromRichTextWithExtensions(
	richText: TLRichText,
	extensions: Extensions
): string {
	const html = generateHTML(richText as JSONContent, extensions)
	// We replace empty paragraphs with a single line break to prevent the browser from collapsing
	// them. The paragraph's attributes are kept: paragraphs render with a `dir` attribute, usually
	// `auto` but `ltr` or `rtl` when the direction was set explicitly or parsed from pasted HTML.
	return html.replace(/<p([^>]*)><\/p>/g, '<p$1><br /></p>')
}

/**
 * Renders HTML from a rich text string.
 *
 * @param editor - The editor instance.
 * @param richText - The rich text content.
 *
 * @public
 */
export function renderHtmlFromRichText(editor: Editor, richText: TLRichText) {
	return htmlCache.get(richText, () => {
		const tipTapExtensions =
			editor.getTextOptions().tipTapConfig?.extensions ?? tipTapDefaultExtensions
		return renderHtmlFromRichTextWithExtensions(richText, tipTapExtensions)
	})
}

/**
 * Renders HTML from a rich text string for measurement.
 * @param editor - The editor instance.
 * @param richText - The rich text content.
 *
 * @public
 */
export function renderHtmlFromRichTextForMeasurement(editor: Editor, richText: TLRichText) {
	const html = renderHtmlFromRichText(editor, richText)
	return `<div class="tl-rich-text">${html}</div>`
}

// A weak cache used to store plaintext that's been extracted from rich text.
const plainTextFromRichTextCache = new WeakCache<TLRichText, string>()

export function isEmptyRichText(richText: TLRichText) {
	// An empty document has no text. It can be encoded several equally-valid ways:
	// an empty `content` array at the doc level, or a single paragraph whose own
	// `content` is missing or an empty array. The interactive editor emits the
	// single-paragraph / missing-`content` form; programmatic authoring (snapshot
	// loads, and agents/importers emitting tldraw JSON) commonly emits the
	// empty-array forms. Treat them all as empty.
	if (richText.content.length === 0) return true
	if (richText.content.length === 1) {
		const node = richText.content[0] as any
		if (!node.content || node.content.length === 0) return true
	}
	return false
}

/**
 * Whether the editor's active rich text selection is inside a bullet or ordered list.
 * @internal
 */
export function isEditingRichTextList(editor: Editor) {
	const textEditor = editor.getRichTextEditor()
	return !!(textEditor?.isActive('bulletList') || textEditor?.isActive('orderedList'))
}

function isListNode(node: Node) {
	return node.type.name === 'bulletList' || node.type.name === 'orderedList'
}

// Without a serializer, tiptap's `getText` treats a list, each of its items, and each item's
// paragraph as separate blocks, so the block separator lands three times between items and the
// markers are lost. This renders one `- ` / `1. ` line per item (nested lists indented) instead.
//
// `range` is the selection being serialized, in document positions: blocks outside it are
// skipped, blocks straddling its edges are cut to it, and a line only gets its marker when the
// selection begins at or before the line's first character.
function renderListToText(
	list: Node,
	listPos: number,
	range: Range,
	textSerializers: Record<string, TextSerializer>,
	indent = ''
): string {
	const isOrdered = list.type.name === 'orderedList'
	const start: number = list.attrs.start ?? 1
	const lines: string[] = []
	list.forEach((item, itemOffset, index) => {
		const marker = isOrdered ? `${start + index}. ` : '- '
		const continuation = ' '.repeat(marker.length)
		const itemPos = listPos + 1 + itemOffset
		item.forEach((child, childOffset, childIndex) => {
			const childPos = itemPos + 1 + childOffset
			if (childPos >= range.to || childPos + child.nodeSize <= range.from) return
			if (isListNode(child)) {
				lines.push(renderListToText(child, childPos, range, textSerializers, indent + continuation))
				return
			}
			const contentStart = childPos + 1
			const prefix =
				range.from <= contentStart ? indent + (childIndex === 0 ? marker : continuation) : ''
			const text = getTextBetween(
				child,
				{
					from: Math.max(0, range.from - contentStart),
					to: Math.min(child.content.size, range.to - contentStart),
				},
				{ blockSeparator: '\n', textSerializers }
			)
			lines.push(prefix + text)
		})
	})
	return lines.join('\n')
}

/**
 * Renders plaintext from a range of a ProseMirror document, with list items marked the same way
 * as {@link renderPlaintextFromRichText}. Used for the `text/plain` clipboard entry while editing,
 * where the range is the current selection. The schema's own serializers (e.g. `hardBreak` ->
 * `\n`) must reach the recursive list calls, so the list serializers are layered onto them rather
 * than replacing them.
 *
 * @internal
 */
export function renderPlaintextFromRichTextRange(doc: Node, range: Range): string {
	const textSerializers = getTextSerializersFromSchema(doc.type.schema)
	const $from = doc.resolve(range.from)
	// A selection inside one block is a run of text, not a list: copying a word (or a whole
	// single item) out of a list item should paste as just that text, without a marker.
	if ($from.parent.isTextblock && $from.sameParent(doc.resolve(range.to))) {
		return getTextBetween(doc, range, { blockSeparator: '\n', textSerializers })
	}
	const list: TextSerializer = ({ node, pos, range }) =>
		renderListToText(node, pos, range, textSerializers)
	textSerializers.bulletList = list
	textSerializers.orderedList = list
	return getTextBetween(doc, range, { blockSeparator: '\n', textSerializers })
}

/**
 * Renders plaintext for the selection of a rich text editor's state.
 *
 * @internal
 */
export function renderPlaintextFromRichTextSelection(state: EditorState): string {
	const { doc, selection } = state
	const from = Math.min(...selection.ranges.map((range) => range.$from.pos))
	const to = Math.max(...selection.ranges.map((range) => range.$to.pos))
	return renderPlaintextFromRichTextRange(doc, { from, to })
}

/**
 * Renders plaintext from a rich text string. Each block renders on its own line, and list items
 * are prefixed with `- ` or `1. ` markers.
 * @param editor - The editor instance.
 * @param richText - The rich text content.
 *
 * @public
 */
export function renderPlaintextFromRichText(editor: Editor, richText: TLRichText) {
	if (isEmptyRichText(richText)) return ''

	return plainTextFromRichTextCache.get(richText, () => {
		const tipTapExtensions =
			editor.getTextOptions().tipTapConfig?.extensions ?? tipTapDefaultExtensions
		const doc = Node.fromJSON(getSchema(tipTapExtensions), richText as JSONContent)
		return renderPlaintextFromRichTextRange(doc, { from: 0, to: doc.content.size })
	})
}

/**
 * Renders JSONContent from html.
 * @param editor - The editor instance.
 * @param richText - The rich text content.
 *
 * @public
 */
export function renderRichTextFromHTML(editor: Editor, html: string): TLRichText {
	const tipTapExtensions =
		editor.getTextOptions().tipTapConfig?.extensions ?? tipTapDefaultExtensions
	const richText = generateJSON(html, tipTapExtensions)
	normalizeLinkHrefs(richText)
	return richText as TLRichText
}

// Pasted HTML can carry an `href` like `example.com`, which the browser would resolve
// relative to the host page. Give it a scheme so the link opens where the author meant. Anything
// that already has a scheme, or is explicitly relative (`/`, `./`, `#`, `?`), is left alone.
function normalizeLinkHrefs(node: JSONContent) {
	if (node.marks) {
		for (const mark of node.marks) {
			if (mark.type !== 'link' || typeof mark.attrs?.href !== 'string') continue
			mark.attrs.href = normalizeHref(mark.attrs.href)
		}
	}
	if (node.content) {
		for (const child of node.content) normalizeLinkHrefs(child)
	}
}

function normalizeHref(href: string) {
	const trimmed = href.trim()
	if (trimmed === '' || /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return href
	if (trimmed.startsWith('//')) return `https:${trimmed}`
	if (/^[/.#?]/.test(trimmed)) return href
	return `https://${trimmed}`
}

/** @public */
export function defaultAddFontsFromNode(
	node: Node,
	state: RichTextFontVisitorState,
	addFont: (font: TLFontFace) => void
) {
	for (const mark of node.marks) {
		if (mark.type.name === 'bold' && state.weight !== 'bold') {
			state = { ...state, weight: 'bold' }
		}
		if (mark.type.name === 'italic' && state.style !== 'italic') {
			state = { ...state, style: 'italic' }
		}
		if (mark.type.name === 'code' && state.family !== 'tldraw_mono') {
			state = { ...state, family: 'tldraw_mono' }
		}
	}

	const fontsForFamily = getOwnProperty(DefaultFontFaces, state.family)
	if (!fontsForFamily) return state

	const fontsForStyle = getOwnProperty(fontsForFamily, state.style)
	if (!fontsForStyle) return state

	const fontsForWeight = getOwnProperty(fontsForStyle, state.weight)
	if (!fontsForWeight) return state

	addFont(fontsForWeight)

	return state
}
