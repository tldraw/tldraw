import { type Extensions, generateText, JSONContent } from '@tiptap/core'
import { type CommentAuthor, createMentionExtension } from '@tldraw/mentions'
import { renderHtmlFromRichTextWithExtensions, TLRichText } from 'tldraw'
import { commentTipTapExtensions, isCommentEmpty } from '../ui/comment-extensions'

/**
 * The author name used when no source can name an id (e.g. a deleted account, or a member with no
 * comment and no live presence). Hosts pre-empt it by resolving the id from `resolveAuthor`.
 *
 * The English fallback, for the places that can't translate: it's a module constant, so the UI
 * reads `comments.unknown-author` instead and only lands here when there are no translations at
 * all. Pass a translated name to {@link summarizeReactions} for the same reason.
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
const textCache = new WeakMap<TLRichText, string>()

/**
 * Render a body through the comment extension set, memoized by body identity in `cache` unless the
 * body carries a mention (see {@link hasMention}), in which case the mention extension resolving
 * `resolveName` is added and nothing is cached.
 */
function renderWithCommentExtensions(
	cache: WeakMap<TLRichText, string>,
	richText: TLRichText,
	resolveName: ((id: string) => string | undefined) | undefined,
	render: (doc: JSONContent, extensions: Extensions) => string
): string {
	const mentions = hasMention(richText as JSONContent)
	if (!mentions) {
		const cached = cache.get(richText)
		if (cached !== undefined) return cached
	}
	const extensions = mentions
		? [...commentTipTapExtensions, createMentionExtension({ resolveName })]
		: commentTipTapExtensions
	const result = render(demoteHeadings(richText as JSONContent), extensions)
	if (!mentions) cache.set(richText, result)
	return result
}

/**
 * Render a comment body to HTML through the limited comment extension set (no headings), so a body
 * always renders with comment formatting regardless of the host editor's rich-text config. Renders
 * through tldraw's shared helper, so it gets the same empty-paragraph fix that keeps blank lines
 * from collapsing. `resolveName` maps a member id to its current name for any @mentions.
 */
export function renderCommentHtml(
	richText: TLRichText,
	resolveName?: (id: string) => string | undefined
): string {
	return renderWithCommentExtensions(htmlCache, richText, resolveName, (doc, extensions) =>
		renderHtmlFromRichTextWithExtensions(doc as TLRichText, extensions)
	)
}

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
	return renderWithCommentExtensions(textCache, richText, resolveName, (doc, extensions) =>
		generateText(doc, extensions, { blockSeparator: '\n' })
	)
}
