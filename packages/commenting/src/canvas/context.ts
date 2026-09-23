import { type CommentAuthor, type MentionMember } from '@tldraw/mentions'
import { type ReactNode } from 'react'
import { type TLComment, type TLCommentId, type TLCommentThreadId } from 'tldraw'

/**
 * The live, host-supplied half of commenting: who the viewer is, how author ids become names, read
 * status, and the mention roster. (The static half is {@link CommentingOptions}, configured once on
 * the tool.)
 *
 * Every commenting surface reads the same set, so a host mounting more than one — `CanvasComments`
 * and `CanvasCommentsSidebar`, say — can build it once and spread it into each rather than
 * repeating the props:
 *
 * ```tsx
 * const commenting: CommentingContext = { currentUserId, resolveAuthor, isCommentUnread }
 *
 * <CanvasComments {...commenting} />
 * <CanvasCommentsSidebar {...commenting} />
 * ```
 *
 * @public
 */
export interface CommentingContext {
	/** The signed-in user's id, or null for a read-only viewer. Only a signed-in user composes. */
	currentUserId: string | null
	/** Map an author id to their display info, or `undefined` when the id can't be resolved. */
	resolveAuthor(id: string): CommentAuthor | undefined
	/** Called after any comment (a new thread's first comment, or a reply) is posted. */
	onPostComment?(comment: TLComment): void
	/** Whether a comment is unread for the current user (return true for unread). */
	isCommentUnread?(commentId: TLCommentId): boolean
	/**
	 * Called with every unread comment shown to the user in an open thread popover, batched per
	 * report, so hosts can record read receipts without a write per comment. Needs
	 * `isCommentUnread` to know what's unread.
	 */
	onCommentsRead?(commentIds: TLCommentId[]): void
	/** Resolve the members matching an `@`-query in the composers (sync or async). */
	getMentionSuggestions?(query: string): MentionMember[] | Promise<MentionMember[]>
	/** Override a mention-picker row's content. */
	renderMentionSuggestion?(member: MentionMember): ReactNode
	/**
	 * The host's URL for a thread, so surfaces can link to it — e.g. the sidebar's rows render as
	 * anchors when this is present, letting ctrl/cmd-click and middle-click open the thread in a
	 * new tab (a plain click still selects the thread in place; the href isn't followed).
	 */
	getThreadHref?(threadId: TLCommentThreadId): string | undefined
}
