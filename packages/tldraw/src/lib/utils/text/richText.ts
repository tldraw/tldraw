import {
	Extension,
	Extensions,
	JSONContent,
	generateHTML,
	generateJSON,
	generateText,
} from '@tiptap/core'
import { Bold } from '@tiptap/extension-bold'
import { BulletList } from '@tiptap/extension-bullet-list'
import Code from '@tiptap/extension-code'
import { Document } from '@tiptap/extension-document'
import { Gapcursor } from '@tiptap/extension-gapcursor'
import { Heading } from '@tiptap/extension-heading'
import Highlight from '@tiptap/extension-highlight'
import { History } from '@tiptap/extension-history'
import { Italic } from '@tiptap/extension-italic'
import Link from '@tiptap/extension-link'
import { ListItem } from '@tiptap/extension-list-item'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'
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

// We change the default Code to override what's in the StarterKit.
// It allows for other attributes/extensions.
Code.config.excludes = undefined

/**
 * Default extensions for the TipTap editor.
 *
 * @public
 */
export const tipTapDefaultExtensions: Extensions = [
	Bold,
	BulletList,
	Code,
	Document,
	Gapcursor,
	Heading,
	History,
	Italic,
	ListItem,
	Paragraph,
	Text,
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
	return html.replaceAll('<p dir="auto"></p>', '<p><br /></p>') ?? ''
}

/**
 * Renders HTML from a rich text string for measurement.
 * @param editor - The editor instance.
 * @param richText - The rich text content.
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
 * @param editor - The editor instance.
 * @param richText - The rich text content.
 *
 *
 * @public
 */
export function renderPlaintextFromRichText(editor: Editor, richText: TLRichText) {
	const tipTapExtensions =
		editor.getTextOptions().tipTapConfig?.extensions ?? tipTapDefaultExtensions
	return generateText(richText as JSONContent, tipTapExtensions)
}

/**
 * Renders JSONContent from html.
 * @param editor - The editor instance.
 * @param richText - The rich text content.
 *
 *
 * @public
 */
export function renderRichTextFromHTML(editor: Editor, html: string): TLRichText {
	const tipTapExtensions =
		editor.getTextOptions().tipTapConfig?.extensions ?? tipTapDefaultExtensions
	return generateJSON(html, tipTapExtensions) as TLRichText
}
