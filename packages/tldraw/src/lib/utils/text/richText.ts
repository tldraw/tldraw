import {
	Extension,
	Extensions,
	JSONContent,
	Editor as TipTapEditor,
	generateHTML,
	generateJSON,
	generateText,
} from '@tiptap/core'
import Code from '@tiptap/extension-code'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import { Plugin } from '@tiptap/pm/state'
import StarterKit from '@tiptap/starter-kit'
import { Editor, TLRichText, stopEventPropagation } from '@tldraw/editor'
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

// it ain't pretty but we need to know when the user is pointing.
// this is used to prevent the toolbar from showing when the user is
// selecting text with their mouse. TT doesn't give us a good way to
// pipe this data out, so we're hijacking their event emitter. wahoo
function handlePointingStart(editor: TipTapEditor, e: unknown) {
	const _pe = e as PointerEvent
	if (_pe.pointerType) {
		;(_pe.currentTarget as HTMLElement).setPointerCapture(_pe.pointerId)
	}
	// @ts-expect-error
	editor.emit('pointer-state-change', { isPointing: true })
	stopEventPropagation(e)
	return false
}

function handlePointingEnd(editor: TipTapEditor, e: unknown) {
	const _pe = e as PointerEvent
	if (_pe.pointerType) {
		;(_pe.currentTarget as HTMLElement).releasePointerCapture(_pe.pointerId)
	}
	// @ts-expect-error
	editor.emit('pointer-state-change', { isPointing: false })
	stopEventPropagation(e)
	return false
}

const PointerStateExtension = Extension.create({
	name: 'pointerStateExtension',
	addProseMirrorPlugins() {
		return [
			new Plugin({
				props: {
					handleDOMEvents: {
						touchstart: (_v, e) => handlePointingStart(this.editor, e),
						pointerdown: (_v, e) => handlePointingStart(this.editor, e),
						mousedown: (_v, e) => handlePointingStart(this.editor, e),
						pointerup: (_v, e) => handlePointingEnd(this.editor, e),
						touchend: (_v, e) => handlePointingEnd(this.editor, e),
						mouseup: (_v, e) => handlePointingEnd(this.editor, e),
					},
				},
			}),
		]
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
	StarterKit,
	Link.configure({
		openOnClick: false,
		autolink: true,
	}),
	Highlight,
	KeyboardShiftEnterTweakExtension,
	TextDirection,
	// TODO: This is causing issues with list item selection
	// enabling onPointerDownCapture in RichTextArea fixes part of the problem
	// but selecting in some cases the toolbar selection won't work when list items
	// are involved.
	// PointerStateExtension,
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
