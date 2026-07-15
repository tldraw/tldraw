import { TLRichText } from 'tldraw'
import { getMentionedMemberIds } from '../../../utils/richText'

/**
 * Why a comment shows up in a user's notifications feed:
 *
 * - `mention` — the comment `@`-mentions the user
 * - `reply` — the comment is in a thread the user is a part of (started, or has commented in)
 * - `owned-board` — the comment is on a file the user owns
 *
 * A single comment can match more than one; {@link CommentNotification.primaryReason} picks the one
 * shown to the user, in the order mention \> reply \> owned-board (most-to-least specific).
 */
export type CommentNotificationReason = 'mention' | 'reply' | 'owned-board'

/** Priority order for {@link CommentNotification.primaryReason}: most specific first. */
const REASON_PRIORITY: CommentNotificationReason[] = ['mention', 'reply', 'owned-board']

/**
 * The comment fields {@link categorizeCommentNotifications} needs. A structural subset of the
 * `app.getComments()` row (with its `author`/`file`/`thread`/`read` relationships) so the
 * categorization can be unit-tested without Zero types. `read` is the caller's read receipt — a
 * related row when present, absent (falsy) when unread.
 */
export interface CommentNotificationInput {
	id: string
	authorId: string
	threadId: string
	createdAt: number
	// Comment body, as rich text JSON. Typed `unknown` so the real Zero row (whose `body` is a wide
	// `ReadonlyJSONValue`) still satisfies this constraint; narrowed to TLRichText where read.
	body: unknown
	read?: unknown
	file?: { ownerId?: string | null } | null
	thread?: { createdBy?: string | null } | null
}

/** A comment that belongs in the notifications feed, tagged with why. */
export interface CommentNotification<
	T extends CommentNotificationInput = CommentNotificationInput,
> {
	comment: T
	/** Every reason this comment qualifies (unordered). */
	reasons: CommentNotificationReason[]
	/** The single reason to surface, per {@link REASON_PRIORITY}. */
	primaryReason: CommentNotificationReason
}

/**
 * Narrows a raw cross-file comment feed to the notifications a user actually cares about, tagging
 * each with why it's there. A comment qualifies when it isn't the user's own and matches at least
 * one of: it's on a board they own, it's in a thread they're a part of, or it `@`-mentions them.
 *
 * Thread participation is derived (there's no stored participant list): a user is "part of" a thread
 * if they created it (`thread.createdBy`) or authored any comment in it within `comments`. Since the
 * feed is capped upstream, participation is best-effort over the fetched window.
 *
 * Returns newest-first.
 */
export function categorizeCommentNotifications<T extends CommentNotificationInput>(
	comments: readonly T[],
	userId: string | undefined | null
): CommentNotification<T>[] {
	if (!userId) return []

	// Threads the user is a part of: ones they started, or have a comment in (within this feed).
	const participantThreadIds = new Set<string>()
	for (const c of comments) {
		if (c.thread?.createdBy === userId || c.authorId === userId) {
			participantThreadIds.add(c.threadId)
		}
	}

	const notifications: CommentNotification<T>[] = []
	for (const comment of comments) {
		// A notification is always about someone else's comment, never your own.
		if (comment.authorId === userId) continue

		const reasons: CommentNotificationReason[] = []
		if (getMentionedMemberIds(comment.body as TLRichText).includes(userId)) reasons.push('mention')
		if (participantThreadIds.has(comment.threadId)) reasons.push('reply')
		if (comment.file?.ownerId === userId) reasons.push('owned-board')
		if (reasons.length === 0) continue

		const primaryReason = REASON_PRIORITY.find((r) => reasons.includes(r))!
		notifications.push({ comment, reasons, primaryReason })
	}

	return notifications.sort((a, b) => b.comment.createdAt - a.comment.createdAt)
}
