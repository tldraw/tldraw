import { TLRulesFragment } from './compose'

/**
 * The comment rules from `createCommentAuthorizers` in `@tldraw/sync-collaboration`, as data.
 * The same object runs on the server (as the room's write rules) and in the editor (to decide
 * which comment affordances to show), so the two can no longer drift.
 *
 * Extension points are `let`s. Redefine them with {@link composeRules}:
 *
 * - `canComment`: may this user write comment records at all. Default: `user.access` is
 *   `'comment'` or `'edit'`.
 * - `mayEditComment`, `mayDeleteComment`, `mayDeleteThread`: default to the record's owner.
 *
 * What no `let` can change: attribution is stamped from `user.id` and frozen, `isDeleted` is
 * write-once and never set at create, `threadId` and `createdAt` are frozen, a resolution is the
 * resolver's own, a reaction lives at its canonical id, and clients never hard-delete comments or
 * threads.
 *
 * @public
 */
export const commentRules = {
	let: {
		canComment: "user.access in ['comment', 'edit']",
		mayEditComment: 'prev.authorId == user.id',
		mayDeleteComment: 'prev.authorId == user.id',
		mayDeleteThread: 'prev.createdBy == user.id',
		resolvedBySelf: 'next.resolved == null || next.resolved.by == user.id',
	},
	types: {
		comment: {
			stamp: { authorId: 'user.id' },
			frozen: ['threadId', 'createdAt'],
			create: 'canComment && next.isDeleted == false',
			update: {
				// A soft delete that also changes other fields is an edit too, so a delete-only
				// permission cannot rewrite a comment on its way out.
				allow: `canComment && (prev.isDeleted == next.isDeleted
					? mayEditComment
					: prev.isDeleted == false && mayDeleteComment && (onlyChanged('isDeleted') || mayEditComment))`,
				message: 'Only the author can change this comment',
			},
			delete: { allow: 'false', message: 'Comments are deleted by flag, not removed' },
		},
		'comment-thread': {
			stamp: { createdBy: 'user.id' },
			frozen: ['createdAt'],
			create: 'canComment && next.isDeleted == false && resolvedBySelf',
			update: `canComment
				&& (!changed('resolved') || resolvedBySelf)
				&& (prev.isDeleted == next.isDeleted || (prev.isDeleted == false && mayDeleteThread))`,
			delete: { allow: 'false', message: 'Threads are deleted by flag, not removed' },
		},
		'comment-reaction': {
			stamp: { userId: 'user.id' },
			frozen: ['commentId', 'threadId', 'pageId', 'emoji'],
			create: `canComment && next.id == 'comment-reaction:' + encode(next.commentId) + ':' + encode(user.id) + ':' + encode(next.emoji)`,
			update: 'canComment && prev.userId == user.id',
			delete: 'canComment && prev.userId == user.id',
		},
	},
} satisfies TLRulesFragment
