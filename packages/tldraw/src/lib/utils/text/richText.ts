import {
	Extension,
	Extensions,
	extensions,
	generateHTML,
	generateJSON,
	generateText,
	JSONContent,
} from '@tiptap/core'
import { Code } from '@tiptap/extension-code'
import { Highlight } from '@tiptap/extension-highlight'
import { Node } from '@tiptap/pm/model'
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
		const html = generateHTML(richText as JSONContent, tipTapExtensions)
		// We replace empty paragraphs with a single line break to prevent the browser from collapsing them.
		return html.replaceAll('<p dir="auto"></p>', '<p><br /></p>') ?? ''
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

/**
 * Renders plaintext from a rich text string.
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
		return generateText(richText as JSONContent, tipTapExtensions, {
			blockSeparator: '\n',
		})
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
	return generateJSON(html, tipTapExtensions) as TLRichText
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
