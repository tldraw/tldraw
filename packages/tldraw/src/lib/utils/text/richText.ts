import { Extension, Extensions, JSONContent, generateHTML, generateText } from '@tiptap/core'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import StarterKit from '@tiptap/starter-kit'
import { Editor, TLRichText } from '@tldraw/editor'
import TextDirection from './textDirection'

const KeyboardShiftEnterTweakExtension = Extension.create({
	name: 'keyboardShiftEnterHandler',
	addKeyboardShortcuts() {
		return {
			// We don't support soft breaks, so we just use the default enter command.
			'Shift-Enter': ({ editor }) => editor.commands.enter(),
		}
	},
})

/**
 * Default extensions for the TipTap editor.
 *
 * @public
 */
export const tipTapDefaultExtensions: Extensions = [
	StarterKit,
	Link.configure({
		openOnClick: false,
		autolink: true,
	}),
	Highlight,
	KeyboardShiftEnterTweakExtension,
	TextDirection,
]

/**
 * Renders HTML from a rich text string.
 *
 * @param editor - The editor instance.
 * @param richText - The rich text content.
 *
 * @public
 */
export function renderHtmlFromRichText(editor: Editor, richText: TLRichText) {
	const tipTapExtensions =
		editor.getTextOptions().tipTapConfig?.extensions ?? tipTapDefaultExtensions
	const html = generateHTML(richText as JSONContent, tipTapExtensions)
	// We replace empty paragraphs with a single line break to prevent the browser from collapsing them.
	return html.replaceAll('<p></p>', '<p><br /></p>') ?? ''
}

/**
 * Renders HTML from a rich text string for measurement.
 * @param richText - The rich text content.
 * @parameditor - The editor instance.
 *
 *
 * @public
 */
export function renderHtmlFromRichTextForMeasurement(editor: Editor, richText: TLRichText) {
	const html = renderHtmlFromRichText(editor, richText)
	return `<div class="tl-rich-text-tiptap">${html}</div>`
}

/**
 * Renders plaintext from a rich text string.
 * @param richText - The rich text content.
 * @parameditor - The editor instance.
 *
 *
 * @public
 */
export function renderPlaintextFromRichText(editor: Editor, richText: TLRichText) {
	const tipTapExtensions =
		editor.getTextOptions().tipTapConfig?.extensions ?? tipTapDefaultExtensions
	return generateText(richText as JSONContent, tipTapExtensions)
}
