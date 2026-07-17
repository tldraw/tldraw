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
 * immutable on update, deletes allowed (cascade cleanup needs non-authors to remove a shape's
 * comments). With `ownerOnlyUpdate`, only the author may update it at all.
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

const authorizeThreadBase = authorizeAuthored<TLCommentThread>('createdBy')

/**
 * Threads stay editable by anyone with access (resolve/reopen), but resolution is itself an
 * attribution: a non-null `resolved.by`, set at create or changed by update, must be the
 * session's own user.
 */
const authorizeThread: TLRecordAuthorizer<TLCommentThread, SessionMeta> = (args) => {
	const result = authorizeThreadBase(args)
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
 * anonymous); enforce it here: an update may only change the attribution to `null` or the
 * session's own user. Creates pass through — duplication legitimately carries another user's
 * attribution, so a forged create is indistinguishable from a duplicate (the delete + re-create
 * loophole this leaves is accepted).
 */
const authorizeShape: TLRecordAuthorizer<TLShape, SessionMeta> = ({
	session,
	type,
	prev,
	next,
}) => {
	if (type === 'create') return next
	if (type === 'delete') return prev
	const before = getNoteAttribution(prev)
	const after = getNoteAttribution(next)
	if (after !== before && after != null && after !== session.meta.userId) return null
	return next
}

/**
 * Force comment and thread authorship from the session's identity, and guard note text
 * attribution, so nothing can be posted or pinned in someone else's name.
 */
export const authorizeFileRecord: TLRecordAuthorizers<FileRecord, SessionMeta> = {
	comment: authorizeAuthored<TLComment>('authorId', { ownerOnlyUpdate: true }),
	'comment-thread': authorizeThread,
	shape: authorizeShape,
}
