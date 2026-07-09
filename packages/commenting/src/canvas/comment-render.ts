import { generateHTML, generateText, JSONContent } from '@tiptap/core'
import { TLRichText } from 'tldraw'
import { commentTipTapExtensions, isCommentEmpty } from '../ui/comment-extensions'

/**
 * The comment extension set has no heading node, so a body that nonetheless contains one (e.g. a
 * record created programmatically or synced from a client with a fuller set) would make TipTap
 * throw on an unknown node type. Demote any heading to a paragraph first, so headings can never
 * render as headings and rendering never crashes.
 */
function demoteHeadings(node: JSONContent): JSONContent {
	const content = Array.isArray(node.content) ? node.content.map(demoteHeadings) : node.content
	if (node.type === 'heading') {
		const { attrs: _attrs, ...rest } = node
		return { ...rest, type: 'paragraph', content }
	}
	return content === node.content ? node : { ...node, content }
}

const htmlCache = new WeakMap<TLRichText, string>()

/**
 * Render a comment body to HTML through the limited comment extension set (no headings), so a body
 * always renders with comment formatting regardless of the host editor's rich-text config. Mirrors
 * tldraw's `renderHtmlFromRichText`, including the empty-paragraph fix that keeps blank lines from
 * collapsing.
 */
export function renderCommentHtml(richText: TLRichText): string {
	const cached = htmlCache.get(richText)
	if (cached !== undefined) return cached
	const html = generateHTML(
		demoteHeadings(richText as JSONContent),
		commentTipTapExtensions
	).replaceAll('<p dir="auto"></p>', '<p><br /></p>')
	htmlCache.set(richText, html)
	return html
}

const textCache = new WeakMap<TLRichText, string>()

/**
 * Flatten a comment body to plaintext through the limited comment extension set — paragraphs and
 * list items separated by newlines. Used for previews (e.g. the sidebar) where formatting is dropped.
 */
export function renderCommentPlaintext(richText: TLRichText): string {
	if (isCommentEmpty(richText)) return ''
	const cached = textCache.get(richText)
	if (cached !== undefined) return cached
	const text = generateText(demoteHeadings(richText as JSONContent), commentTipTapExtensions, {
		blockSeparator: '\n',
	})
	textCache.set(richText, text)
	return text
}
