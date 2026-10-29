import { extractMentionIds } from '@tldraw/mentions'

/**
 * Why a comment concerns a user:
 *
 * - `mention` — the comment `@`-mentions the user
 * - `reply` — the comment is in a thread the user is a part of (started, or has commented in),
 *   posted after they joined it
 * - `owned-board` — the comment is on a board the user owns (the caller decides what owning means)
 * - `reaction` — the user's own comment, reacted to by someone else. The only reason about the
 *   user's own comments, so it never combines with the others
 *
 * A single comment can match more than one; {@link CommentNotification.primaryReason} picks the one
 * shown to the user, in the order mention \> reply \> owned-board (most-to-least specific).
 * @internal
 */
export type CommentNotificationReason = 'mention' | 'reply' | 'owned-board' | 'reaction'

const REASON_PRIORITY: CommentNotificationReason[] = ['mention', 'reply', 'owned-board', 'reaction']

/**
 * The comment fields notifications need — a structural subset of a `TLComment` joined with its
 * thread and reactions, so the same rules run over the editor store's records or an app's own
 * synced rows.
 * @internal
 */
export interface CommentNotificationInput {
	id: string
	authorId: string
	threadId: string
	createdAt: number
	// Typed `unknown` so wide JSON row types still satisfy this; extractMentionIds accepts unknown.
	body: unknown
	/** The caller's read receipt, when the app keeps them. Its `readAt` is what lets a reaction
	 *  newer than it re-unread the entry. Without receipts every entry reads as unread. */
	read?: { readAt?: number | null } | null
	thread?: {
		createdBy?: string | null
		/** The caller's own comments in the thread; anyone else's are ignored. */
		comments?: readonly { authorId: string; createdAt: number }[] | null
	} | null
	/** Every reaction to the comment, the caller's own included. */
	reactions?:
		| readonly { userId: string; userName?: string; emoji: string; createdAt: number }[]
		| null
}

/** A comment that concerns the user, tagged with why. @internal */
export interface CommentNotification<
	T extends CommentNotificationInput = CommentNotificationInput,
> {
	comment: T
	/** Every reason this comment qualifies (unordered). */
	reasons: CommentNotificationReason[]
	/** The single reason to surface, per priority mention \> reply \> owned-board. */
	primaryReason: CommentNotificationReason
	/** When the notified-about event happened: the newest foreign reaction for a `reaction` entry,
	 *  the comment's creation otherwise. */
	timestamp: number
	/** Unread until the comment has a read receipt; a reaction entry stays unread while the newest
	 *  foreign reaction postdates the receipt. */
	unread: boolean
}

/** @internal */
export interface CategorizeCommentNotificationsOptions<T extends CommentNotificationInput> {
	/** Whether the comment is on a board the user owns, for the `owned-board` reason. */
	ownsBoard?(comment: T): boolean
}

/**
 * Tags each comment that concerns the user with why, newest first. Comments by the user, and
 * comments with no reason, are dropped.
 *
 * The reply reason only applies to comments from strictly after the user joined the thread:
 * earlier ones are context they saw when joining, not notifications. The strict compare assumes
 * `createdAt` increases within a thread, so a new comment can never tie with the reader's join.
 * Post-join replies stay once responded to; read receipts, not membership, handle their unread
 * state.
 * @internal
 */
export function categorizeCommentNotifications<T extends CommentNotificationInput>(
	comments: readonly T[],
	userId: string | undefined | null,
	opts: CategorizeCommentNotificationsOptions<T> = {}
): CommentNotification<T>[] {
	if (!userId) return []

	const notifications: CommentNotification<T>[] = []
	for (const comment of comments) {
		// reactions to the user's own comments come from buildReactionNotifications
		if (comment.authorId === userId) continue

		const reasons: CommentNotificationReason[] = []
		if (extractMentionIds(comment.body).includes(userId)) reasons.push('mention')
		if (comment.createdAt > joinedThreadAt(comment.thread, userId)) reasons.push('reply')
		if (opts.ownsBoard?.(comment)) reasons.push('owned-board')
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
 * @internal
 */
export function summarizeForeignReactors(
	reactions: CommentNotificationInput['reactions'],
	userId: string | undefined | null
): { names: string[]; others: number; total: number } {
	const byId = new Map<string, { name?: string; newest: number }>()
	for (const r of reactions ?? []) {
		if (r.userId === userId) continue
		const seen = byId.get(r.userId)
		if (!seen || r.createdAt > seen.newest)
			byId.set(r.userId, { name: r.userName, newest: r.createdAt })
	}
	const ordered = [...byId.values()].sort((a, b) => b.newest - a.newest)
	// typeof guard: rows from a source that doesn't carry names arrive without it
	const names = ordered
		.map((e) => e.name)
		.filter((n): n is string => typeof n === 'string' && n !== '')
		.slice(0, 2)
	return { names, others: ordered.length - names.length, total: ordered.length }
}

/** Newest `createdAt` among `reactions` from someone other than `userId`; `undefined` if none. @internal */
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
 * Turns the user's own comments that someone else has reacted to into one
 * {@link CommentNotification} per comment, dated and marked unread by the newest foreign reaction
 * (strict \>: a receipt from the same instant counts as read). Comments by anyone else are skipped.
 * @internal
 */
export function buildReactionNotifications<T extends CommentNotificationInput>(
	comments: readonly T[],
	userId: string | undefined | null
): CommentNotification<T>[] {
	if (!userId) return []

	const notifications: CommentNotification<T>[] = []
	for (const comment of comments) {
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

/**
 * How much of the feed reaches the user outside the app: everything, only mentions and replies in
 * their threads, or only mentions. Comments on their boards and reactions are the noisy reasons,
 * so they're the first to go.
 * @internal
 */
export type CommentNotificationLevel = 'all' | 'mentions-and-replies' | 'mentions'

/** Whether a notification is one the user wants at `level`. @internal */
export function isAtNotificationLevel(
	notification: CommentNotification<any>,
	level: CommentNotificationLevel
): boolean {
	switch (level) {
		case 'all':
			return true
		case 'mentions-and-replies':
			return notification.reasons.includes('mention') || notification.reasons.includes('reply')
		case 'mentions':
			return notification.reasons.includes('mention')
	}
}

/** Unions per-reason comment feeds: a comment matching several reasons arrives in each. @internal */
export function mergeCommentFeeds<T extends { id: string }>(
	...feeds: readonly (readonly T[])[]
): T[] {
	const seen = new Set<string>()
	const merged: T[] = []
	for (const feed of feeds) {
		for (const comment of feed) {
			if (seen.has(comment.id)) continue
			seen.add(comment.id)
			merged.push(comment)
		}
	}
	return merged
}

/** Merges notification lists newest-first. @internal */
export function mergeNotifications<T extends CommentNotificationInput>(
	...feeds: readonly CommentNotification<T>[][]
): CommentNotification<T>[] {
	return feeds.flat().sort((a, b) => b.timestamp - a.timestamp)
}
