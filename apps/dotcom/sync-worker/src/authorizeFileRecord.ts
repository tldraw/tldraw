import { UnknownRecord } from '@tldraw/store'
import { TLRecordAuthorizer, TLRecordAuthorizers } from '@tldraw/sync-core'
import { TLComment, TLCommentThread, TLNoteShape, TLRecord, TLShape } from '@tldraw/tlschema'

/** Per-session metadata attached to each socket: the local store id and the authenticated user (if any). */
export interface SessionMeta {
	storeId: string
	userId: string | null
}

// The file room's record union, widened to include the object-lane comment records so each
// authorizer is typed to its record — renaming an attribution field fails to compile here.
type FileRecord = TLRecord | TLComment | TLCommentThread

/**
 * Authorize a record whose attribution lives in `field`: stamped from the session on create,
 * immutable on update. With `ownerOnlyUpdate`, only the author may update it at all.
 */
function authorizeAuthored<Rec extends UnknownRecord>(
	field: keyof Rec & string,
	{ ownerOnlyUpdate = false } = {}
): TLRecordAuthorizer<Rec, SessionMeta> {
	return ({ session, type, prev, next }) => {
		if (type === 'create') {
			if (!session.meta.userId) return null // no identity to attribute → reject
			return { ...next, [field]: session.meta.userId } as Rec
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
 * Police a soft-deleted record type on top of `base`: deletion is a write-once `isDeleted`
 * flag — set exactly once, never cleared, only by the record's owner (`ownerOf`), never on
 * create — and clients never hard-delete these records at all. Record removals are server-side
 * only (author-cascade and soft-delete prunes, which don't run authorizers), so once the flag
 * is drained there is no un-delete.
 */
function authorizeSoftDeleted<Rec extends UnknownRecord & { isDeleted: boolean }>(
	ownerOf: (rec: Rec) => string,
	base: TLRecordAuthorizer<Rec, SessionMeta>
): TLRecordAuthorizer<Rec, SessionMeta> {
	return (args) => {
		if (args.type === 'delete') return null
		const result = base(args)
		if (!result) return null
		// A record can't be born deleted — that would smuggle a deletion past the update checks.
		if (args.type === 'create' && args.next.isDeleted) return null
		if (args.type === 'update') {
			const { session, prev, next } = args
			if (prev.isDeleted !== next.isDeleted) {
				if (prev.isDeleted) return null // write-once: never cleared
				if (session.meta.userId !== ownerOf(prev)) return null // only the owner deletes
			}
		}
		return result
	}
}

/**
 * Threads stay editable by anyone with access (resolve/reopen), but resolution is itself an
 * attribution: a non-null `resolved.by`, set at create or changed by update, must be the
 * session's own user.
 */
const authorizeThreadResolution: TLRecordAuthorizer<TLCommentThread, SessionMeta> = (args) => {
	const result = authorizeAuthored<TLCommentThread>('createdBy')(args)
	if (!result) return null
	if (args.type === 'create') {
		// Delete + re-put could otherwise smuggle in a resolution forged in someone else's name.
		const { session, next } = args
		if (next.resolved && next.resolved.by !== session.meta.userId) return null
	}
	if (args.type === 'update') {
		const { session, prev, next } = args
		const changed =
			prev.resolved?.at !== next.resolved?.at || prev.resolved?.by !== next.resolved?.by
		if (changed && next.resolved && next.resolved.by !== session.meta.userId) return null
	}
	return result
}

const authorizeThread = authorizeSoftDeleted<TLCommentThread>(
	(thread) => thread.createdBy,
	authorizeThreadResolution
)

const authorizeComment = authorizeSoftDeleted<TLComment>(
	(comment) => comment.authorId,
	authorizeAuthored<TLComment>('authorId', { ownerOnlyUpdate: true })
)

/**
 * A note's text attribution, or `undefined` when the shape isn't carrying one (non-note shapes).
 * Authorizers see records at the server's schema version, so only the current field name exists.
 */
function getNoteAttribution(shape: TLShape): string | null | undefined {
	if (shape.type !== 'note') return undefined
	return (shape as TLNoteShape).props.textLastEditedBy
}

/**
 * Notes stamp `textLastEditedBy` client-side (the editor on text edit, `null` when emptied or
 * anonymous). Enforce it here on both create and update: the attribution may only be `null` or
 * the session's own user. Duplication and paste re-stamp the copy to the current user (via
 * `NoteShapeUtil.onBeforeDuplicate`), so a legitimate create never carries another user's
 * attribution and we can reject one that does — closing the forged-create loophole the create
 * passthrough previously had to accept. Updates still allow an unchanged attribution from any
 * user, so anyone with access can edit a note's other props.
 */
const authorizeShape: TLRecordAuthorizer<TLShape, SessionMeta> = ({
	session,
	type,
	prev,
	next,
}) => {
	if (type === 'delete') return prev
	// On create there's no prior attribution; on update an unchanged attribution is always allowed.
	const before = type === 'create' ? null : getNoteAttribution(prev)
	const after = getNoteAttribution(next)
	if (after !== before && after != null && after !== session.meta.userId) return null
	return next
}

/**
 * Force comment and thread authorship from the session's identity, and guard note text
 * attribution, so nothing can be posted or pinned in someone else's name.
 */
export const authorizeFileRecord: TLRecordAuthorizers<FileRecord, SessionMeta> = {
	comment: authorizeComment,
	'comment-thread': authorizeThread,
	shape: authorizeShape,
}
