import { createCommentAuthorizers } from '@tldraw/commenting-core'
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
 * Force comment and thread authorship from the session's identity (via the shared commenting
 * authorizers), and guard note text attribution, so nothing can be posted or pinned in someone
 * else's name.
 */
export const authorizeFileRecord: TLRecordAuthorizers<FileRecord, SessionMeta> = {
	...createCommentAuthorizers<SessionMeta>({ getUserId: (session) => session.meta.userId }),
	shape: authorizeShape,
}
