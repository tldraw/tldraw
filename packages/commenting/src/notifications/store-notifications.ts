import { Editor, TLComment, TLCommentId, TLCommentReaction, TLCommentThread } from 'tldraw'
import {
	getCommentReactions,
	getLiveComments,
	getLiveCommentThreads,
} from '../canvas/comment-store'
import {
	buildReactionNotifications,
	categorizeCommentNotifications,
	CommentNotification,
	CommentNotificationInput,
	mergeNotifications,
} from './comment-notifications'

/** A notification input built from the editor store, carrying its record for routing. @internal */
export interface StoreCommentNotificationInput extends CommentNotificationInput {
	record: TLComment
}

/** @internal */
export interface StoreCommentNotificationsOptions {
	/** Whether the user owns this board, for the `owned-board` reason. */
	ownsBoard?: boolean
	/**
	 * The host's read state, as `CanvasComments` takes it. Without it every entry is unread. A
	 * yes/no read state can't tell a fresh reaction from one already seen, so reaction entries stay
	 * unread either way; the notifier still shows each one once.
	 */
	isCommentUnread?(commentId: TLCommentId): boolean
}

/**
 * The comment records that concern `userId`, as notifications, newest first. Pure over the
 * records so it can be tested without an editor; {@link getStoreCommentNotifications} reads them
 * from a store.
 *
 * Store records carry no read receipts; pass the host's `isCommentUnread` for those.
 * @internal
 */
export function buildStoreCommentNotifications(
	records: {
		comments: readonly TLComment[]
		threads: readonly TLCommentThread[]
		reactions: readonly TLCommentReaction[]
	},
	userId: string | undefined | null,
	opts: StoreCommentNotificationsOptions = {}
): CommentNotification<StoreCommentNotificationInput>[] {
	if (!userId) return []

	const threadById = new Map(records.threads.map((t) => [t.id, t]))
	const ownCommentsByThread = new Map<string, TLComment[]>()
	for (const c of records.comments) {
		if (c.authorId !== userId) continue
		const list = ownCommentsByThread.get(c.threadId) ?? []
		list.push(c)
		ownCommentsByThread.set(c.threadId, list)
	}
	const reactionsByComment = new Map<string, TLCommentReaction[]>()
	for (const r of records.reactions) {
		const list = reactionsByComment.get(r.commentId) ?? []
		list.push(r)
		reactionsByComment.set(r.commentId, list)
	}

	const inputs: StoreCommentNotificationInput[] = []
	for (const c of records.comments) {
		// a comment in a deleted or pruned thread has no surface to open
		const thread = threadById.get(c.threadId)
		if (!thread) continue
		inputs.push({
			id: c.id,
			authorId: c.authorId,
			threadId: c.threadId,
			createdAt: c.createdAt,
			body: c.body,
			thread: { createdBy: thread.createdBy, comments: ownCommentsByThread.get(c.threadId) },
			reactions: reactionsByComment.get(c.id),
			read: opts.isCommentUnread && !opts.isCommentUnread(c.id) ? {} : null,
			record: c,
		})
	}

	return mergeNotifications(
		categorizeCommentNotifications(inputs, userId, { ownsBoard: () => opts.ownsBoard ?? false }),
		buildReactionNotifications(inputs, userId)
	)
}

/**
 * The editor store's comments that concern `userId`, as notifications, newest first. Reactive
 * when read inside a signal context (`react`, `computed`, `useValue`).
 * @internal
 */
export function getStoreCommentNotifications(
	editor: Editor,
	userId: string | undefined | null,
	opts?: StoreCommentNotificationsOptions
): CommentNotification<StoreCommentNotificationInput>[] {
	return buildStoreCommentNotifications(
		{
			comments: getLiveComments(editor),
			threads: getLiveCommentThreads(editor),
			reactions: getCommentReactions(editor),
		},
		userId,
		opts
	)
}
