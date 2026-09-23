import { extractMentionIds } from '@tldraw/dotcom-shared'

/**
 * Why a comment shows up in a user's notifications feed:
 *
 * - `mention` — the comment `@`-mentions the user
 * - `reply` — the comment is in a thread the user is a part of (started, or has commented in),
 *   posted after they joined it
 * - `owned-board` — the comment is on a board in the user's own home workspace
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
 * The comment fields the notifications feed needs — a structural subset of the Zero row so this
 * is unit-testable without Zero types. Both feeds yield comment rows: `comments` carries other
 * people's comments that concern the caller, `reactions` the caller's own that were reacted to.
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
	file?: { owningGroupId?: string | null; name?: string | null } | null
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
 * from strictly after the user joined the thread — earlier ones are context they saw when
 * joining, not notifications. The strict compare leans on Postgres stamping `createdAt`
 * monotonically per thread on insert (migration 046): every new comment lands strictly after the
 * thread's max, so it can never tie with or fall behind the reader's join and get dropped. Rows
 * from before that migration keep their client stamps, so in an old thread a pre-migration reply
 * whose author's clock ran behind the reader's can still read as history and drop — accepted:
 * that regime only shrinks, and only ever covers comments that predate the migration. A comment
 * with no reason left is dropped. Post-join replies stay in the feed once responded to; read
 * receipts, not membership, handle their unread state.
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
		if (comment.createdAt > joinedThreadAt(comment.thread, userId)) reasons.push('reply')
		if (comment.file?.owningGroupId === userId) reasons.push('owned-board')
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

/** Newest `createdAt` among `reactions` from someone other than `userId`; `undefined` if none. */
export function latestForeignReactionAt(
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
 * Turns the reactions feed — the caller's own comments that someone else has reacted to — into one
 * {@link CommentNotification} per comment. Each entry is dated and marked unread by the newest
 * foreign reaction in the comment's own unbounded `reactions` set, which also feeds the byline and
 * pills (strict >: a receipt from the same instant counts as read).
 *
 * The feed rows are comments rather than reactions because the query is rooted at `comment`; see
 * `queries.reactions` for why that rooting is load-bearing.
 */
export function buildReactionNotifications(
	comments: readonly CommentNotificationInput[],
	userId: string | undefined | null
): CommentNotification<CommentNotificationInput>[] {
	if (!userId) return []

	const notifications: CommentNotification<CommentNotificationInput>[] = []
	for (const comment of comments) {
		// server already filters to the caller's own comments; cheap belt against a foreign row
		if (comment.authorId !== userId) continue
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
