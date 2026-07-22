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
 * immutable on update. With `ownerOnlyUpdate`, only the author may update it at all; with
 * `ownerOnlyDelete`, only the author may delete it.
 */
function authorizeAuthored<Rec extends UnknownRecord>(
	field: keyof Rec & string,
	{ ownerOnlyUpdate = false, ownerOnlyDelete = false } = {}
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
		if (ownerOnlyDelete && session.meta.userId !== prev[field]) return null // only the author deletes
		return prev
	}
}

const authorizeThreadBase = authorizeAuthored<TLCommentThread>('createdBy')

/**
 * Threads stay editable by anyone with access (resolve/reopen), but resolution is itself an
 * attribution: a non-null `resolved.by`, set at create or changed by update, must be the
 * session's own user.
 *
 * Thread deletion is soft: clients set `deleted` (creator-only, self-attributed, write-once —
 * once drained, the server prunes the records, so there is no un-delete) and never remove
 * thread records; record removals are server-side only (author-cascade and soft-delete prunes,
 * which don't run authorizers).
 */
const authorizeThread: TLRecordAuthorizer<TLCommentThread, SessionMeta> = (args) => {
	if (args.type === 'delete') return null
	const result = authorizeThreadBase(args)
	if (!result) return null
	if (args.type === 'create') {
		// Delete + re-put could otherwise smuggle in a resolution forged in someone else's name.
		const { session, next } = args
		if (next.resolved && next.resolved.by !== session.meta.userId) return null
		// A thread can't be born deleted — that would smuggle a deletion past the update checks.
		if (next.deleted) return null
	}
	if (args.type === 'update') {
		const { session, prev, next } = args
		const changed =
			prev.resolved?.at !== next.resolved?.at || prev.resolved?.by !== next.resolved?.by
		if (changed && next.resolved && next.resolved.by !== session.meta.userId) return null
		const deletedChanged =
			prev.deleted?.at !== next.deleted?.at || prev.deleted?.by !== next.deleted?.by
		if (deletedChanged) {
			if (prev.deleted || !next.deleted) return null // write-once: set exactly once, never cleared
			if (session.meta.userId !== prev.createdBy) return null // only the thread's creator deletes
			if (next.deleted.by !== session.meta.userId) return null // and attributes it to themselves
		}
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
	comment: authorizeAuthored<TLComment>('authorId', {
		ownerOnlyUpdate: true,
		ownerOnlyDelete: true,
	}),
	'comment-thread': authorizeThread,
	shape: authorizeShape,
}
