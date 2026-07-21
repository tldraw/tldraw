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
 * Every user id whose reaction entry differs between two thread reaction maps — added, removed, or
 * changed — across every comment. Used to check that a write only touches the session's own
 * reactions; anyone with access can write the thread record, so without this a client could add a
 * reaction in someone else's name or clear everyone else's.
 */
function getChangedReactionUserIds(
	prev: TLCommentThread['reactions'],
	next: TLCommentThread['reactions']
): Set<string> {
	const changed = new Set<string>()
	for (const commentId of new Set([...Object.keys(prev ?? {}), ...Object.keys(next ?? {})])) {
		const before = prev?.[commentId] ?? {}
		const after = next?.[commentId] ?? {}
		for (const userId of new Set([...Object.keys(before), ...Object.keys(after)])) {
			const a = before[userId]
			const b = after[userId]
			if (a?.emoji !== b?.emoji || a?.createdAt !== b?.createdAt) changed.add(userId)
		}
	}
	return changed
}

/**
 * Threads stay editable by anyone with access (resolve/reopen, and reacting to any comment in the
 * thread), but the parts that carry attribution are guarded: a non-null `resolved.by` must be the
 * session's own user, and a write may only add, change, or remove that user's own reactions.
 */
const authorizeThread: TLRecordAuthorizer<TLCommentThread, SessionMeta> = (args) => {
	const result = authorizeThreadBase(args)
	if (!result) return null
	if (args.type === 'create') {
		// Delete + re-put could otherwise smuggle in a resolution — or a set of reactions — forged
		// in someone else's name.
		const { session, next } = args
		if (next.resolved && next.resolved.by !== session.meta.userId) return null
		for (const userId of getChangedReactionUserIds(null, next.reactions)) {
			if (userId !== session.meta.userId) return null
		}
	}
	if (args.type === 'update') {
		const { session, prev, next } = args
		const changed =
			prev.resolved?.at !== next.resolved?.at || prev.resolved?.by !== next.resolved?.by
		if (changed && next.resolved && next.resolved.by !== session.meta.userId) return null
		for (const userId of getChangedReactionUserIds(prev.reactions, next.reactions)) {
			if (userId !== session.meta.userId) return null
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
	comment: authorizeAuthored<TLComment>('authorId', { ownerOnlyUpdate: true }),
	'comment-thread': authorizeThread,
	shape: authorizeShape,
}
