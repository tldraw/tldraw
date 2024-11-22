import { generateHTML, generateText } from '@tiptap/core'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import StarterKit from '@tiptap/starter-kit'
import { Editor } from '@tldraw/editor'

/** @public */
export const tipTapDefaultExtensions = [
	StarterKit,
	Link.configure({
		openOnClick: false,
		autolink: true,
		defaultProtocol: 'https',
	}),
	Highlight,
]

/** @public */
export function renderHtmlFromRichText(editor: Editor, richText: string) {
	const html = generateHTML(JSON.parse(richText), tipTapDefaultExtensions)
	// We replace empty paragraphs with a single line break to prevent the browser from collapsing them.
	return html.replaceAll('<p></p>', '<p><br /></p>') ?? ''
}

/** @public */
export function renderHtmlFromRichTextForMeasurement(editor: Editor, richText: string) {
	const html = renderHtmlFromRichText(editor, richText)
	return `<div class="tl-rich-text-tiptap">${html}</div>`
}

/** @public */
export function renderPlaintextFromRichText(editor: Editor, richText: string) {
	return generateText(JSON.parse(richText), tipTapDefaultExtensions)
}
