import type { TLSyncForwardDiff, TLSyncPlugin } from '@tldraw/sync-core'
import {
	commentSchemaRecords,
	TLComment,
	TLCommentId,
	TLCommentThread,
	TLCommentThreadId,
} from './records'

export { commentSchemaRecords, type TLComment, type TLCommentThread } from './records'

/** The record types the comments plugin serves through the object-store lane. @public */
export const COMMENT_OBJECT_TYPES = ['comment-thread', 'comment'] as const

/** @public */
export interface CommentChanges {
	puts: Array<TLComment | TLCommentThread>
	deletes: Array<TLCommentId | TLCommentThreadId>
}

function isCommentRecord(record: { typeName: string }): record is TLComment | TLCommentThread {
	return record.typeName === 'comment' || record.typeName === 'comment-thread'
}

function isCommentRecordId(id: string): id is TLCommentId | TLCommentThreadId {
	return id.startsWith('comment:') || id.startsWith('comment-thread:')
}

/** Extracts comment puts/deletes from a committed sync diff. @public */
export function filterCommentChanges(diff: TLSyncForwardDiff<any>): CommentChanges {
	const puts: Array<TLComment | TLCommentThread> = []
	for (const put of Object.values(diff.puts)) {
		const record = Array.isArray(put) ? put[1] : put
		if (isCommentRecord(record)) {
			puts.push(record)
		}
	}
	return {
		puts,
		deletes: diff.deletes.filter(isCommentRecordId),
	}
}

/** @public */
export interface CommentsSyncPluginOptions {
	/** Called with comment puts/deletes after each commit that touches comment records. */
	onChange?(changes: CommentChanges): void
}

/**
 * The server half of the comments plugin. Pass to `TLSocketRoom` and the sync storage via their
 * `plugins` option.
 *
 * @public
 */
export function commentsSyncPlugin(options: CommentsSyncPluginOptions = {}): TLSyncPlugin {
	const { onChange } = options
	return {
		id: 'tldraw.comments',
		records: commentSchemaRecords,
		objectTypes: COMMENT_OBJECT_TYPES,
		onCommittedChanges: onChange
			? ({ diff }) => {
					const changes = filterCommentChanges(diff)
					if (changes.puts.length === 0 && changes.deletes.length === 0) return
					onChange(changes)
				}
			: undefined,
	}
}
