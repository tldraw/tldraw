import { Role, TlaFile, can } from '@tldraw/dotcom-shared'
import { createCommentAuthorizers } from '@tldraw/sync-collaboration'
import { TLRecordAuthorizer, TLRecordAuthorizers } from '@tldraw/sync-core'
import {
	TLComment,
	TLCommentReaction,
	TLCommentThread,
	TLNoteShape,
	TLRecord,
	TLShape,
} from '@tldraw/tlschema'

/** Per-session metadata attached to each socket: the local store id and the authenticated user (if any). */
export interface SessionMeta {
	storeId: string
	userId: string | null
}

// The file room's record union, widened to include the object-lane comment records so each
// authorizer is typed to its record — renaming an attribution field fails to compile here.
type FileRecord = TLRecord | TLComment | TLCommentThread | TLCommentReaction

/**
 * A note's text attribution, or `undefined` when the shape isn't carrying one (non-note shapes).
 * Authorizers see records at the server's schema version, so only the current field name exists.
 */
function getNoteAttribution(shape: TLShape): string | null | undefined {
	if (shape.type !== 'note') return undefined
	return (shape as TLNoteShape).props.textLastEditedBy
}

/**
 * Slurped notes can carry a browser-local author ID. Rejecting their creates drops the notes
 * from the imported board, so re-stamp foreign attribution from the session instead. Updates
 * may retain an existing author but cannot claim a new identity other than the session's user.
 */
const authorizeShape: TLRecordAuthorizer<TLShape, SessionMeta> = ({
	session,
	type,
	prev,
	next,
}) => {
	if (type === 'delete') return prev
	const before = type === 'create' ? null : getNoteAttribution(prev)
	const after = getNoteAttribution(next)
	if (after !== before && after != null && after !== session.meta.userId) {
		if (type === 'update') return null
		const note = next as TLNoteShape
		return { ...note, props: { ...note.props, textLastEditedBy: session.meta.userId } }
	}
	return next
}

/**
 * Force comment, thread, and reaction authorship from the session's identity (via the shared
 * commenting authorizers), and guard note text attribution, so nothing can be posted, pinned,
 * or reacted in someone else's name.
 */
export const authorizeFileRecord = {
	...createCommentAuthorizers<SessionMeta>({ getUserId: (session) => session.meta.userId }),
	shape: authorizeShape,
} satisfies TLRecordAuthorizers<FileRecord, SessionMeta>

/**
 * What a signed-in user may do in an app file's room: nothing, read (canvas and comments), or edit
 * (canvas and comments). The one statement of the rule, read by the socket connect and by the MCP
 * server's comment write, so an agent can comment exactly where its user could.
 *
 * Guests get canvas write, and with it comments (see `canComment` in `createCommentAuthorizers`),
 * only on an `edit` link. `sharedLinkType` is a plain string column with legacy values in it, so
 * anything else fails closed.
 */
export function getFileRoomAccess(
	file: Pick<TlaFile, 'shared' | 'sharedLinkType'>,
	role: Role | null
): 'none' | 'read' | 'write' {
	if (can(role, 'accessFiles')) return 'write'
	if (!file.shared) return 'none'
	return file.sharedLinkType === 'edit' ? 'write' : 'read'
}
