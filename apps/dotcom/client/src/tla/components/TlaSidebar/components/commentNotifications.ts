import {
	categorizeCommentNotifications as categorize,
	CommentNotification,
	CommentNotificationInput as BaseCommentNotificationInput,
} from '@tldraw/commenting'
import { createDeepLinkString } from 'tldraw'
import { routes } from '../../../../routeDefs'

export {
	buildReactionNotifications,
	latestForeignReactionAt,
	mergeNotifications,
	summarizeForeignReactors,
	type CommentNotification,
	type CommentNotificationReason,
} from '@tldraw/commenting'

/**
 * The SDK's input plus the fields dotcom's Zero feeds join in for rendering and routing. Comment
 * feeds carry others' comments that concern the caller; `reactions` carries the caller's own
 * reacted-to comments.
 */
export interface CommentNotificationInput extends BaseCommentNotificationInput {
	authorName?: string | null
	authorColor?: string | null
	fileId: string
	file?: { owningGroupId?: string | null; name?: string | null } | null
	thread?:
		| (NonNullable<BaseCommentNotificationInput['thread']> & { shapeId?: string | null })
		| null
}

/**
 * The SDK's categorization, with `owned-board` meaning a board in the user's own home workspace.
 *
 * The SDK's strict reply compare leans on Postgres stamping `createdAt` monotonically per thread
 * on insert (migration 046). Rows from before that migration keep their client stamps, so in an
 * old thread a pre-migration reply whose author's clock ran behind the reader's can still read as
 * history and drop — accepted: that regime only shrinks.
 */
export function categorizeCommentNotifications<T extends CommentNotificationInput>(
	comments: readonly T[],
	userId: string | undefined | null
): CommentNotification<T>[] {
	return categorize(comments, userId, {
		ownsBoard: (c) => c.file?.owningGroupId === userId,
	})
}

/** Unions the per-reason Zero feeds: a comment matching several reasons arrives in each. */
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

/** Deep link to a comment's file, anchored to its shape (when shape-anchored) so its popover opens. */
export function commentLink(fileId: string, shapeId: string | null | undefined, commentId: string) {
	const base = `${routes.tlaFile(fileId)}?comment=${encodeURIComponent(commentId)}`
	if (!shapeId) return base
	const d = createDeepLinkString({ type: 'shapes', shapeIds: [shapeId as any] })
	return `${base}&d=${d}`
}
