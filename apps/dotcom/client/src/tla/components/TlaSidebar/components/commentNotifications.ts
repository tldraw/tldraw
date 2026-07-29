import { extractMentionIds } from '@tldraw/dotcom-shared'

/**
 * Why a comment shows up in a user's notifications feed:
 *
 * - `mention` — the comment `@`-mentions the user
 * - `reply` — the comment is in a thread the user is a part of (started, or has commented in),
 *   posted after they joined it
 * - `owned-board` — the comment is on a file the user owns
 *
 * A single comment can match more than one; {@link CommentNotification.primaryReason} picks the one
 * shown to the user, in the order mention \> reply \> owned-board (most-to-least specific).
 */
export type CommentNotificationReason = 'mention' | 'reply' | 'owned-board'

/** Priority order for {@link CommentNotification.primaryReason}: most specific first. */
const REASON_PRIORITY: CommentNotificationReason[] = ['mention', 'reply', 'owned-board']

/**
 * How far a comment may predate the user's join time and still count as a reply.
 *
 * `createdAt` is stamped by the authoring client's clock (`createComment` in tlschema defaults to
 * `Date.now()`), so the join gate compares timestamps written by two different machines. A user
 * whose clock runs fast stamps their own join late, and a reply that genuinely followed it reads
 * as thread history — silently dropped, with nothing in the UI to hint at what's missing.
 *
 * The two failure directions aren't symmetric: too small a tolerance loses real notifications,
 * too large lets a few already-seen comments through. So this errs permissive, at a minute — well
 * past the drift of a roughly-synced clock, and short enough that it can't readmit a thread's
 * history, which is what the gate exists to keep out.
 */
const JOIN_TIME_SKEW_TOLERANCE_MS = 60_000

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
	thread?: {
		createdBy?: string | null
		/** The caller's own comments in the thread (the query syncs no one else's). */
		comments?: readonly { authorId: string; createdAt: number }[] | null
	} | null
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
 * Tags each comment in the notifications feed with why it's there, newest first.
 *
 * Stricter than the `comments` synced query, whose reply category has no timing condition (ZQL
 * can't compare `createdAt` across correlated rows): the reply reason only applies to comments
 * from after the user joined the thread (within {@link JOIN_TIME_SKEW_TOLERANCE_MS}) — earlier
 * ones are context they saw when joining, not notifications. A comment with no reason left is
 * dropped. Post-join replies stay in the feed once responded to; read receipts, not membership,
 * handle their unread state.
 */
export function categorizeCommentNotifications<T extends CommentNotificationInput>(
	comments: readonly T[],
	userId: string | undefined | null
): CommentNotification<T>[] {
	if (!userId) return []

	const notifications: CommentNotification<T>[] = []
	for (const comment of comments) {
		// A notification is always about someone else's comment, never your own.
		if (comment.authorId === userId) continue

		const reasons: CommentNotificationReason[] = []
		if (extractMentionIds(comment.body).includes(userId)) reasons.push('mention')
		// the two sides of this comparison come from different machines' clocks, hence the
		// tolerance — see JOIN_TIME_SKEW_TOLERANCE_MS
		const joinedAt = joinedThreadAt(comment.thread, userId)
		if (comment.createdAt > joinedAt - JOIN_TIME_SKEW_TOLERANCE_MS) reasons.push('reply')
		if (comment.file?.ownerId === userId) reasons.push('owned-board')
		if (reasons.length === 0) continue

		const primaryReason = REASON_PRIORITY.find((r) => reasons.includes(r))!
		notifications.push({ comment, reasons, primaryReason })
	}

	return notifications.sort((a, b) => b.comment.createdAt - a.comment.createdAt)
}

/**
 * When the user joined a thread: -Infinity for one they started, else their first surviving
 * comment in it, else Infinity (not a participant).
 */
function joinedThreadAt(thread: CommentNotificationInput['thread'], userId: string): number {
	if (thread?.createdBy === userId) return -Infinity
	let joinedAt = Infinity
	for (const c of thread?.comments ?? []) {
		if (c.authorId === userId && c.createdAt < joinedAt) joinedAt = c.createdAt
	}
	return joinedAt
}
