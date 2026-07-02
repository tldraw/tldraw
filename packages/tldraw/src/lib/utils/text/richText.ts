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
import { StarterKit } from '@tiptap/starter-kit'
import {
	Editor,
	getOwnProperty,
	RichTextFontVisitorState,
	TLFontFace,
	TLRichText,
	TLShape,
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
 * Default extensions for the TipTap editor.
 *
 * @public
 */
export const tipTapDefaultExtensions: Extensions = [
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
	}),
	Highlight,
	KeyboardShiftEnterTweakExtension,

	// N.B. We disable the text direction core extension in RichTextArea,
	// but we add it back in again here in our own extensions list so that
	// people can omit/override it if they want to.
	extensions.TextDirection.configure({ direction: 'auto' }),
]

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
	if (richText.content.length === 1) {
		if (!(richText.content[0] as any).content) return true
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

/**
 * Whether every text node in a rich text document has the given mark. Returns `false` if there are
 * no text nodes. Useful for deciding whether toggling a mark should add or remove it.
 *
 * @param richText - The rich text content.
 * @param markName - The mark type name, e.g. `'bold'` or `'italic'`.
 *
 * @public
 */
export function richTextHasMarkEverywhere(richText: TLRichText, markName: string): boolean {
	let hasTextNode = false
	let allMarked = true

	const visit = (node: any) => {
		if (!node || typeof node !== 'object') return
		if (node.type === 'text') {
			hasTextNode = true
			const marks: any[] = Array.isArray(node.marks) ? node.marks : []
			if (!marks.some((mark) => mark?.type === markName)) {
				allMarked = false
			}
			return
		}
		if (Array.isArray(node.content)) {
			for (const child of node.content) visit(child)
		}
	}

	visit(richText)

	return hasTextNode && allMarked
}

/**
 * Returns a copy of the rich text content with the given mark added to or removed from every text
 * node. Does not mutate the input.
 *
 * @param richText - The rich text content.
 * @param markName - The mark type name, e.g. `'bold'` or `'italic'`.
 * @param enabled - Whether the mark should be present (`true`) or absent (`false`) on every text node.
 * @param attrs - Optional mark attributes, e.g. `{ href }` for a `'link'` mark. When provided, an
 *   existing mark of the same type is replaced so its attributes are updated.
 *
 * @public
 */
export function setMarkOnRichText(
	richText: TLRichText,
	markName: string,
	enabled: boolean,
	attrs?: Record<string, unknown>
): TLRichText {
	const visit = (node: any): any => {
		if (!node || typeof node !== 'object') return node

		if (node.type === 'text') {
			const marks: any[] = Array.isArray(node.marks) ? node.marks : []
			let nextMarks: any[]
			if (enabled) {
				const mark = attrs ? { type: markName, attrs } : { type: markName }
				// A plain mark that's already present can be left as-is, but a mark with attributes
				// (e.g. a link's href) is always rewritten so its attributes update.
				if (!attrs && marks.some((m) => m?.type === markName)) return node
				nextMarks = [...marks.filter((m) => m?.type !== markName), mark]
			} else {
				if (!marks.some((mark) => mark?.type === markName)) return node
				nextMarks = marks.filter((mark) => mark?.type !== markName)
			}
			return { ...node, marks: nextMarks }
		}

		if (Array.isArray(node.content)) {
			return { ...node, content: node.content.map(visit) }
		}

		return node
	}

	return visit(richText) as TLRichText
}

/**
 * The shapes in the editor's current selection that a "format the selection" action should apply
 * to: shapes with a `richText` prop that holds actual text content and aren't locked. Shapes with
 * an empty label (no text content) are skipped so they don't keep a fully-marked selection from
 * toggling off, and locked shapes are left untouched.
 *
 * @internal
 */
export function getFormattableSelectedShapes(
	editor: Editor
): (TLShape & { props: { richText: TLRichText } })[] {
	return editor
		.getSelectedShapes()
		.filter(
			(shape): shape is TLShape & { props: { richText: TLRichText } } =>
				'richText' in shape.props &&
				!editor.isShapeOrAncestorLocked(shape.id) &&
				!isEmptyRichText(shape.props.richText)
		)
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
