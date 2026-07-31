import { extractMentionIds } from '@tldraw/dotcom-shared'

/**
 * Why a comment shows up in a user's notifications feed:
 *
 * - `mention` — the comment `@`-mentions the user
 * - `reply` — the comment is in a thread the user is a part of (started, or has commented in),
 *   posted after they joined it
 * - `owned-board` — the comment is on a file the user owns
 * - `reaction` — the user's own comment, reacted to by someone else. The only reason about the
 *   user's own comments, so it never combines with the others
 *
 * A single comment can match more than one; {@link CommentNotification.primaryReason} picks the one
 * shown to the user, in the order mention \> reply \> owned-board (most-to-least specific).
 */
export type CommentNotificationReason = 'mention' | 'reply' | 'owned-board' | 'reaction'

/** Priority order for {@link CommentNotification.primaryReason}: most specific first. */
const REASON_PRIORITY: CommentNotificationReason[] = ['mention', 'reply', 'owned-board', 'reaction']

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
 * The comment fields the notifications feed needs — a structural subset of the Zero row so this
 * is unit-testable without Zero types. A `T` is either a comments-feed row, or a reactions-feed
 * row's related comment.
 */
export interface CommentNotificationInput {
	id: string
	authorId: string
	authorName?: string | null
	authorColor?: string | null
	fileId: string
	threadId: string
	createdAt: number
	// Comment body, as rich text JSON. Typed `unknown` so the real Zero row (whose `body` is a wide
	// `ReadonlyJSONValue`) still satisfies this constraint; extractMentionIds accepts unknown.
	body: unknown
	/** The caller's read receipt — a related row when present, absent (falsy) when unread. Its
	 *  `readAt` dates the receipt, which is what lets a reaction newer than it re-unread the entry. */
	read?: { readAt?: number | null } | null
	file?: { ownerId?: string | null; name?: string | null } | null
	thread?: {
		createdBy?: string | null
		shapeId?: string | null
		/** The caller's own comments in the thread (the query syncs no one else's). */
		comments?: readonly { authorId: string; createdAt: number }[] | null
	} | null
	/** Every reaction to the comment, the caller's own included. Categorization only reads who and
	 *  when; `emoji` rides along for the row's reaction pills; `userName` is the reactor's display
	 *  name, denormalized from `user.name` onto reaction rows by Postgres triggers. */
	reactions?:
		| readonly { userId: string; userName?: string; emoji: string; createdAt: number }[]
		| null
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
	/** When the notified-about event happened: the newest foreign reaction for a `reaction` entry,
	 *  the comment's creation otherwise. Orders the feed and dates the row. */
	timestamp: number
	/** Whether the entry needs the user's attention. A comment entry is unread until it has a read
	 *  receipt; a reaction entry is unread while the newest foreign reaction postdates the receipt —
	 *  so fresh reactions re-unread a comment the user had already read. */
	unread: boolean
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
		// A notification is always about someone else's comment; reactions to the user's own
		// comments come from the separate reactions feed (see buildReactionNotifications).
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
		notifications.push({
			comment,
			reasons,
			primaryReason,
			timestamp: comment.createdAt,
			unread: !comment.read,
		})
	}

	return notifications.sort((a, b) => b.timestamp - a.timestamp)
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

/**
 * The reactor summary a "reacted to your comment" byline is phrased from: up to two distinct
 * reactor names (newest reaction first, blank or missing names skipped but still counted), how
 * many distinct people react beyond the named ones, and the distinct total for when no name is
 * available at all.
 */
export function summarizeForeignReactors(
	reactions: CommentNotificationInput['reactions'],
	userId: string | undefined | null
): { names: string[]; others: number; total: number } {
	// distinct foreign reactors, newest reaction first
	const byId = new Map<string, { name?: string; newest: number }>()
	for (const r of reactions ?? []) {
		if (r.userId === userId) continue
		const seen = byId.get(r.userId)
		if (!seen || r.createdAt > seen.newest)
			byId.set(r.userId, { name: r.userName, newest: r.createdAt })
	}
	const ordered = [...byId.values()].sort((a, b) => b.newest - a.newest)
	// typeof guard: rows synced before a view-syncer picks up the userName column arrive without it
	const names = ordered
		.map((e) => e.name)
		.filter((n): n is string => typeof n === 'string' && n !== '')
		.slice(0, 2)
	return { names, others: ordered.length - names.length, total: ordered.length }
}

/** One row of the reactions feed: a foreign reaction joined to the reacted-to comment. Only
 *  `commentId`/`userId`/`emoji`/`createdAt` matter here (dedupe key and ordering); the byline and
 *  pills read the comment's own unbounded `reactions` set instead. */
export interface ReactionNotificationInput {
	commentId: string
	userId: string
	userName?: string
	emoji: string
	createdAt: number
	/** Absent only if the row outraced its comment's sync; such rows are dropped. */
	comment?: CommentNotificationInput | null
}

/** Newest `createdAt` among `reactions` from someone other than `userId`; `undefined` if none. */
function latestForeignReactionAt(
	reactions: CommentNotificationInput['reactions'],
	userId: string
): number | undefined {
	let latest: number | undefined
	for (const r of reactions ?? []) {
		if (r.userId !== userId && (latest === undefined || r.createdAt > latest)) latest = r.createdAt
	}
	return latest
}

/**
 * Groups the reactions feed into one {@link CommentNotification} per reacted-to comment. Feed
 * rows only decide which comments appear (deduped by `commentId`); the entry's `comment` rides
 * along as-is, its unbounded `reactions` set feeding the byline and pills. Dated and marked
 * unread by the newest foreign reaction in that set (strict >: same-instant receipt = read).
 */
export function buildReactionNotifications(
	reactions: readonly ReactionNotificationInput[],
	userId: string | undefined | null
): CommentNotification<CommentNotificationInput>[] {
	if (!userId) return []

	const comments = new Map<string, CommentNotificationInput>()
	for (const row of reactions) {
		// server already filters both; cheap belt against a dangling or self row slipping through
		if (!row.comment || row.userId === userId) continue
		comments.set(row.commentId, row.comment)
	}

	const notifications: CommentNotification<CommentNotificationInput>[] = []
	for (const comment of comments.values()) {
		const timestamp = latestForeignReactionAt(comment.reactions, userId)
		if (timestamp === undefined) continue
		notifications.push({
			comment,
			reasons: ['reaction'],
			primaryReason: 'reaction',
			timestamp,
			unread: timestamp > (comment.read?.readAt ?? -Infinity),
		})
	}

	return notifications
}

/** Merges both feeds' entries newest-first; the panel and its tests share this. */
export function mergeNotifications<T extends CommentNotificationInput>(
	...feeds: readonly CommentNotification<T>[][]
): CommentNotification<T>[] {
	return feeds.flat().sort((a, b) => b.timestamp - a.timestamp)
}
