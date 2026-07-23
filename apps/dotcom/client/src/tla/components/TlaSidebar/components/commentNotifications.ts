import { extractMentionIds } from '@tldraw/dotcom-shared'

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
 * `app.getComments()` row (with its `file`/`thread`/`read` relationships) so the categorization
 * can be unit-tested without Zero types. `read` is the caller's read receipt — a related row
 * when present, absent (falsy) when unread.
 */
export interface CommentNotificationInput {
	id: string
	authorId: string
	threadId: string
	createdAt: number
	// Comment body, as rich text JSON. Typed `unknown` so the real Zero row (whose `body` is a wide
	// `ReadonlyJSONValue`) still satisfies this constraint; extractMentionIds accepts unknown.
	body: unknown
	read?: unknown
	file?: { ownerId?: string | null } | null
	thread?: { createdBy?: string | null } | null
}

/** A comment in the notifications feed, tagged with why it's there. */
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
 * Tags each comment in the notifications feed with why it's there, newest first. The `comments`
 * synced query already filters to the three categories server-side — comments on boards the user
 * owns, replies in threads they're a part of, and `@`-mentions of them — so this derives labels,
 * not membership: nothing the server sent is dropped (except the user's own comments, which the
 * server also excludes; the local re-check is just defense in depth).
 *
 * Two of the three reasons re-derive exactly from synced data (`file.ownerId`; mention ids in the
 * body). Thread participation can't always be re-derived: the evidence — the user's own earlier
 * comment in the thread — may be older than the feed's bounded window. A comment with no locally
 * derivable reason is therefore labeled `reply`, the only category the client can fail to see
 * evidence for.
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
		if (extractMentionIds(comment.body).includes(userId)) reasons.push('mention')
		if (participantThreadIds.has(comment.threadId)) reasons.push('reply')
		if (comment.file?.ownerId === userId) reasons.push('owned-board')
		// The server only syncs in-category comments; when no reason is derivable locally, the
		// participation evidence is outside the synced window — so it's a reply (see docs above).
		if (reasons.length === 0) reasons.push('reply')

		const primaryReason = REASON_PRIORITY.find((r) => reasons.includes(r))!
		notifications.push({ comment, reasons, primaryReason })
	}

	return notifications.sort((a, b) => b.comment.createdAt - a.comment.createdAt)
}
