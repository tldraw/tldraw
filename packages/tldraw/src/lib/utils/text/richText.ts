import {
	Extension,
	Extensions,
	extensions,
	generateJSON,
	getSchema,
	JSONContent,
} from '@tiptap/core'
import { Code } from '@tiptap/extension-code'
import { Highlight } from '@tiptap/extension-highlight'
import { DOMParser as ProseMirrorDOMParser, DOMSerializer, Node } from '@tiptap/pm/model'
import { StarterKit, type StarterKitOptions } from '@tiptap/starter-kit'
import {
	Editor,
	getGlobalDocument,
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
	// This is what tiptap's `generateHTML` does internally, minus its hard dependency on a global
	// `window.document`: serializing against an explicit document lets headless environments
	// provide one (see `setDefaultDocument`) without installing DOM globals process-wide.
	const doc = getGlobalDocument()
	if (!doc) {
		throw new Error(
			'tldraw: rendering rich text requires a Document implementation. In a headless ' +
				'environment, provide one with setDefaultDocument().'
		)
	}
	const schema = getSchema(extensions)
	const contentNode = Node.fromJSON(schema, richText as JSONContent)
	const container = doc.createElement('div')
	DOMSerializer.fromSchema(schema).serializeFragment(
		contentNode.content,
		{ document: doc },
		container
	)
	const html = container.innerHTML
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

type TextSerializers = Record<string, (props: { node: JSONContent }) => string>

// tiptap attaches a node extension's `renderText` to its schema spec as `toText`; collecting
// those here keeps custom nodes (mentions, emoji) serializing the way generateText did.
function getTextSerializers(extensions: Extensions): TextSerializers {
	const serializers: TextSerializers = {}
	const schema = getSchema(extensions)
	for (const [name, type] of Object.entries(schema.nodes)) {
		const toText = (type.spec as { toText?: TextSerializers[string] }).toText
		if (toText) serializers[name] = toText
	}
	return serializers
}

// One plaintext line per textblock, with hard breaks splitting lines. A textblock is a
// paragraph/heading (even empty — a blank line) or any node with direct text/hardBreak
// children: an allowlist alone would drop code-block text, and empty plaintext routes into
// the editor's delete-shape-when-empty paths. This replaces tiptap's generateText, whose
// per-block-boundary separator doubled for nested blocks ('\n\none\n\ntwo' for a list).
function collectPlaintextLines(node: JSONContent, lines: string[], serializers: TextSerializers) {
	const isTextBlock =
		node.type === 'paragraph' ||
		node.type === 'heading' ||
		(node.content?.some((child) => child.type === 'text' || child.type === 'hardBreak') ?? false)
	if (isTextBlock) {
		let line = ''
		for (const child of node.content ?? []) {
			if (child.type === 'hardBreak') {
				lines.push(line)
				line = ''
			} else {
				const serialize = child.type ? serializers[child.type] : undefined
				line += serialize ? serialize({ node: child }) : (child.text ?? '')
			}
		}
		lines.push(line)
		return
	}
	const serialize = node.type ? serializers[node.type] : undefined
	if (serialize && !node.content?.length) {
		// A custom leaf node sitting at block level still gets its text serializer
		lines.push(serialize({ node }))
		return
	}
	for (const child of node.content ?? []) {
		collectPlaintextLines(child, lines, serializers)
	}
}

const textSerializersCache = new WeakCache<Editor, TextSerializers>()
const plainTextPerEditorCache = new WeakCache<Editor, WeakCache<TLRichText, string>>()

/**
 * Renders plaintext from a rich text string.
 * @param editor - The editor instance.
 * @param richText - The rich text content.
 *
 * @public
 */
export function renderPlaintextFromRichText(editor: Editor, richText: TLRichText) {
	if (isEmptyRichText(richText)) return ''

	const serializers = textSerializersCache.get(editor, () => {
		try {
			return getTextSerializers(
				editor.getTextOptions().tipTapConfig?.extensions ?? tipTapDefaultExtensions
			)
		} catch {
			// textOptions: null — no extensions means no custom serializers, and plaintext
			// rendering itself needs none
			return {}
		}
	})
	const renderLines = () => {
		const lines: string[] = []
		collectPlaintextLines(richText as JSONContent, lines, serializers)
		return lines.join('\n')
	}
	// Custom serializers make the output editor-specific, so those editors get their own
	// cache; the shared cache is only safe for the serializer-free default configuration.
	if (Object.keys(serializers).length === 0) {
		return plainTextFromRichTextCache.get(richText, renderLines)
	}
	return plainTextPerEditorCache.get(editor, () => new WeakCache()).get(richText, renderLines)
}

// Mirrors the whitespace stripping inside tiptap's elementFromString, so the headless parse
// below produces the same document a browser's generateJSON would for formatted html.
function removeFormattingWhitespace(node: {
	childNodes: ArrayLike<{ nodeType: number; nodeValue: string | null }>
	removeChild(child: any): unknown
}) {
	const children = node.childNodes
	for (let i = children.length - 1; i >= 0; i -= 1) {
		const child = children[i] as any
		if (child.nodeType === 3 && child.nodeValue && /^(\n\s\s|\n)$/.test(child.nodeValue)) {
			node.removeChild(child)
		} else if (child.nodeType === 1) {
			removeFormattingWhitespace(child)
		}
	}
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
	// eslint-disable-next-line no-restricted-globals
	if (typeof window !== 'undefined') {
		return generateJSON(html, tipTapExtensions) as TLRichText
	}
	// Headless: generateJSON requires window.DOMParser. The injected document (linkedom) is a
	// real HTML parser, so parse there and run the same ProseMirror DOMParser tiptap uses.
	const doc = getGlobalDocument()
	if (!doc) {
		throw new Error(
			'tldraw: parsing rich text from HTML requires a Document implementation. In a headless ' +
				'environment, provide one with setDefaultDocument().'
		)
	}
	const container = doc.createElement('div')
	container.innerHTML = html
	removeFormattingWhitespace(container)
	const schema = getSchema(tipTapExtensions)
	return ProseMirrorDOMParser.fromSchema(schema).parse(container).toJSON() as TLRichText
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
