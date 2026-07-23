import { generateHTML, generateText, JSONContent } from '@tiptap/core'
import { TLRichText } from 'tldraw'
import { CommentAuthor } from '../ui/comment-author'
import { commentTipTapExtensions, isCommentEmpty } from '../ui/comment-extensions'
import { commentMention } from '../ui/comment-mention'

/**
 * The author name shown in a byline when no source can name an id (e.g. a deleted account, or a
 * member with no comment and no live presence). The toolkit's one generic default, applied where a
 * byline needs a name; hosts pre-empt it by resolving the id from `resolveAuthor`. Not a
 * translation key — a single English literal.
 */
export const UNKNOWN_AUTHOR = 'Someone'

/** The `CommentAuthor` fallback for an unresolvable id — just the name, no color or image.
 *  Frozen: the one shared instance is handed to host render slots. */
export const UNKNOWN_COMMENT_AUTHOR: CommentAuthor = Object.freeze({ name: UNKNOWN_AUTHOR })

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

/**
 * Whether a body contains a mention node. Mention text is resolved from a member id at render time,
 * so a body with one can't be cached by identity alone (the same body renders differently as names
 * change) — those bodies skip the cache and re-render each call.
 */
function hasMention(node: JSONContent): boolean {
	if (node.type === 'mention') return true
	return Array.isArray(node.content) ? node.content.some(hasMention) : false
}

const htmlCache = new WeakMap<TLRichText, string>()

/**
 * Render a comment body to HTML through the limited comment extension set (no headings), so a body
 * always renders with comment formatting regardless of the host editor's rich-text config. Mirrors
 * tldraw's `renderHtmlFromRichText`, including the empty-paragraph fix that keeps blank lines from
 * collapsing. `resolveName` maps a member id to its current name for any @mentions.
 */
export function renderCommentHtml(
	richText: TLRichText,
	resolveName?: (id: string) => string | undefined
): string {
	const mentions = hasMention(richText as JSONContent)
	if (!mentions) {
		const cached = htmlCache.get(richText)
		if (cached !== undefined) return cached
	}
	const extensions = mentions
		? [...commentTipTapExtensions, commentMention({ resolveName })]
		: commentTipTapExtensions
	const html = generateHTML(demoteHeadings(richText as JSONContent), extensions).replaceAll(
		'<p dir="auto"></p>',
		'<p><br /></p>'
	)
	if (!mentions) htmlCache.set(richText, html)
	return html
}

const textCache = new WeakMap<TLRichText, string>()

/**
 * Flatten a comment body to plaintext through the limited comment extension set — paragraphs and
 * list items separated by newlines. Used for previews (e.g. the sidebar) where formatting is dropped.
 * `resolveName` maps a member id to its current name for any @mentions.
 */
export function renderCommentPlaintext(
	richText: TLRichText,
	resolveName?: (id: string) => string | undefined
): string {
	if (isCommentEmpty(richText)) return ''
	const mentions = hasMention(richText as JSONContent)
	if (!mentions) {
		const cached = textCache.get(richText)
		if (cached !== undefined) return cached
	}
	const extensions = mentions
		? [...commentTipTapExtensions, commentMention({ resolveName })]
		: commentTipTapExtensions
	const text = generateText(demoteHeadings(richText as JSONContent), extensions, {
		blockSeparator: '\n',
	})
	if (!mentions) textCache.set(richText, text)
	return text
}
