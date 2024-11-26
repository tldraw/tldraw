import { Extensions, generateHTML, generateText } from '@tiptap/core'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import StarterKit from '@tiptap/starter-kit'
import { Editor } from '@tldraw/editor'

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
]

/**
 * Renders HTML from a rich text string.
 *
 * @param editor - The editor instance.
 * @param richText - The rich text string.
 *
 * @public
 */
export function renderHtmlFromRichText(editor: Editor, richText: string) {
	const tipTapExtensions =
		editor.getTextOptions().tipTapConfig?.extensions ?? tipTapDefaultExtensions
	const html = generateHTML(JSON.parse(richText), tipTapExtensions)
	// We replace empty paragraphs with a single line break to prevent the browser from collapsing them.
	return html.replaceAll('<p></p>', '<p><br /></p>') ?? ''
}

/**
 * Renders HTML from a rich text string for measurement.
 * @param richText - The rich text string.
 * @parameditor - The editor instance.
 *
 *
 * @public
 */
export function renderHtmlFromRichTextForMeasurement(editor: Editor, richText: string) {
	const html = renderHtmlFromRichText(editor, richText)
	return `<div class="tl-rich-text-tiptap">${html}</div>`
}

/**
 * Renders plaintext from a rich text string.
 * @param richText - The rich text string.
 * @parameditor - The editor instance.
 *
 *
 * @public
 */
export function renderPlaintextFromRichText(editor: Editor, richText: string) {
	const tipTapExtensions =
		editor.getTextOptions().tipTapConfig?.extensions ?? tipTapDefaultExtensions
	return generateText(JSON.parse(richText), tipTapExtensions)
}
