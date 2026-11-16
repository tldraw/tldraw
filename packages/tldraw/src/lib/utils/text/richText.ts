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
	TextSerializer,
} from '@tiptap/core'
import { Code } from '@tiptap/extension-code'
import { Highlight } from '@tiptap/extension-highlight'
import { Typography } from '@tiptap/extension-typography'
import { Node, Schema, Slice } from '@tiptap/pm/model'
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
import { LiteralTypingExtension } from './literalTyping'
import { WrapSelectionExtension } from './wrapSelection'

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
			// List every enabled block type: a missing one gets an empty paragraph appended after it
			// that the user can't delete (#7641 for lists, #11113 for headings).
			trailingNode: {
				notAfter: ['paragraph', 'heading', 'bulletList', 'orderedList', 'listItem'],
			},
			...starterKitOptions,
		}),
		Highlight,
		Typography,
		LiteralTypingExtension,
		WrapSelectionExtension,
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
 * Whether the editor's active rich text selection is inside a list.
 *
 * `taskList` isn't in the default extension set, but when it is added its list items bind Tab and
 * Shift-Tab themselves. Leaving it out here lets our own Tab handling run alongside TipTap's, so a
 * single keypress both indents the text and nests the item.
 *
 * @internal
 */
export function isEditingRichTextList(editor: Editor) {
	const textEditor = editor.getRichTextEditor()
	return !!(
		textEditor?.isActive('bulletList') ||
		textEditor?.isActive('orderedList') ||
		textEditor?.isActive('taskList')
	)
}

const listTypes = new Set(['bulletList', 'orderedList', 'taskList'])

function getListMarker(list: Node, item: Node, index: number) {
	if (list.type.name === 'orderedList') return `${(list.attrs.start ?? 1) + index}. `
	if (list.type.name === 'taskList') return item.attrs.checked ? '- [x] ' : '- [ ] '
	return '- '
}

interface PlaintextLine {
	prefix: string
	text: string
}

// tiptap's `getText` puts a block separator before every block, so each list item (list > item >
// paragraph) gets three and loses its marker. Render one line per textblock line instead, with
// list markers, and nested items and wrapped lines indented under their marker.
function renderPlaintextLines(
	node: Node,
	textSerializers: Record<string, TextSerializer>,
	indent = ''
): PlaintextLine[] {
	if (node.isTextblock) {
		return getTextBetween(
			node,
			{ from: 0, to: node.content.size },
			{ blockSeparator: '\n', textSerializers }
		)
			.split('\n')
			.map((text) => ({ prefix: '', text }))
	}
	const lines: PlaintextLine[] = []
	if (!listTypes.has(node.type.name)) {
		node.forEach((child) => lines.push(...renderPlaintextLines(child, textSerializers, indent)))
		return lines
	}
	node.forEach((item, _offset, index) => {
		const marker = indent + getListMarker(node, item, index)
		const continuation = ' '.repeat(marker.length)
		let isFirstLine = true
		item.forEach((child) => {
			if (listTypes.has(child.type.name)) {
				lines.push(...renderPlaintextLines(child, textSerializers, continuation))
				return
			}
			for (const { text } of renderPlaintextLines(child, textSerializers)) {
				lines.push({ prefix: isFirstLine ? marker : continuation, text })
				isFirstLine = false
			}
		})
	})
	return lines
}

// An empty line drops its marker, so an empty list still counts as empty text.
function joinPlaintextLines(lines: PlaintextLine[]) {
	return lines.map(({ prefix, text }) => (text ? prefix + text : '')).join('\n')
}

/**
 * Renders the `text/plain` clipboard entry for a slice copied from a rich text editor, with list
 * items marked the same way as {@link renderPlaintextFromRichText}.
 *
 * @internal
 */
export function renderPlaintextFromRichTextSlice(slice: Slice, schema: Schema): string {
	const doc = schema.topNodeType.create(null, slice.content)
	const lines = renderPlaintextLines(doc, getTextSerializersFromSchema(schema))
	// An open edge is a line the selection cut. A cut first line doesn't start at its marker, and
	// a selection that starts at the end of a line or ends at the start of one leaves it empty.
	if (slice.openStart > 0 && lines.length) {
		lines[0] = { prefix: '', text: lines[0].text }
		if (!lines[0].text) lines.shift()
	}
	if (slice.openEnd > 0 && lines.length && !lines[lines.length - 1].text) lines.pop()
	return joinPlaintextLines(lines)
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
		return joinPlaintextLines(
			renderPlaintextLines(doc, getTextSerializersFromSchema(doc.type.schema))
		)
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
