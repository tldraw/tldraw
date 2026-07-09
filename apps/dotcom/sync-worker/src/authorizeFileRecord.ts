import { UnknownRecord } from '@tldraw/store'
import { TLRecordAuthorizer, TLRecordAuthorizers } from '@tldraw/sync-core'
import { TLComment, TLCommentThread, TLRecord } from '@tldraw/tlschema'

/** Per-session metadata attached to each socket: the local store id and the authenticated user (if any). */
export interface SessionMeta {
	storeId: string
	userId: string | null
}

// The file room's record union, widened to include the object-lane comment records so the per-type
// authorizers are typed to their record (e.g. `comment`'s `next` is a `TLComment`). Renaming an
// attribution field makes the authorizer that stamps/guards it fail to compile.
type FileRecord = TLRecord | TLComment | TLCommentThread

/**
 * Build an authorizer for a record whose attribution lives in a single `field`: stamp it from the
 * session's identity on create, keep it immutable on update, and allow deletes (cascade cleanup
 * relies on non-authors being able to remove a shape's comments). `field` is `keyof Rec`, so
 * renaming the record's attribution field is a compile error here.
 *
 * With `ownerOnlyUpdate`, only the record's own author may update it — so nobody can edit someone
 * else's comment (which would render under the original author). Leave it off for records anyone
 * with access may update, e.g. resolving a thread.
 */
function authorizeAuthored<Rec extends UnknownRecord>(
	field: keyof Rec & string,
	{ ownerOnlyUpdate = false } = {}
): TLRecordAuthorizer<Rec, SessionMeta> {
	return ({ session, type, prev, next }) => {
		if (type === 'create') {
			// No authenticated identity → can't attribute → reject; the client self-corrects.
			if (!session.meta.userId) return null
			return { ...next!, [field]: session.meta.userId } as Rec
		}
		if (type === 'update') {
			if (next[field] !== prev[field]) return null // attribution is immutable
			if (ownerOnlyUpdate && session.meta.userId !== prev[field]) return null // only the author edits
			return next
		}
		return prev
	}
}

/**
 * Force comment and thread authorship from the session's authenticated identity, so nobody can post
 * in — or edit a comment into — someone else's name.
 */
export const authorizeFileRecord: TLRecordAuthorizers<FileRecord, SessionMeta> = {
	comment: authorizeAuthored<TLComment>('authorId', { ownerOnlyUpdate: true }),
	// Threads stay editable by anyone with access so they can be resolved/reopened; only `createdBy`
	// is pinned.
	'comment-thread': authorizeAuthored<TLCommentThread>('createdBy'),
}
