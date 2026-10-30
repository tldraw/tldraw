import { TLStoreSnapshot } from 'tldraw'

const COMMENT_TYPES = new Set(['comment', 'comment-thread', 'comment-reaction'])

/** The preview store registers no comment schema, so comment records would fail validation. */
export function stripCommentRecords(snapshot: TLStoreSnapshot): TLStoreSnapshot {
	return {
		...snapshot,
		store: Object.fromEntries(
			Object.entries(snapshot.store).filter(([, r]) => !COMMENT_TYPES.has(r.typeName))
		) as TLStoreSnapshot['store'],
	}
}
