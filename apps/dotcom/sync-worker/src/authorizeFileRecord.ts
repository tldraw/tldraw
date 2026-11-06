import { createCommentAuthorizer, isCommentRecord } from '@tldraw/sync-collaboration'
import {
	createLaneAccessAuthorizer,
	TLRecordChange,
	TLSyncAuthorizer,
	TLSyncAuthorizerSession,
} from '@tldraw/sync-core'
import {
	TLComment,
	TLCommentReaction,
	TLCommentThread,
	TLNoteShape,
	TLRecord,
	TLShape,
} from '@tldraw/tlschema'

/** Per-session metadata attached to each socket: the local store id. */
export interface SessionMeta {
	storeId: string
}

// Record types served through the room's object-store lane: persisted in Postgres via the
// comment outbox rather than the R2 document blob, and judged by the shared comment rules below.
export const OBJECT_TYPES = ['comment-thread', 'comment', 'comment-reaction'] as const

// The file room's record union, widened to include the object-lane comment records.
export type FileRecord = TLRecord | TLComment | TLCommentThread | TLCommentReaction

type FileSession = TLSyncAuthorizerSession<SessionMeta>
type ShapeChange = { session: FileSession } & TLRecordChange<TLShape>

/**
 * A note's text attribution, or `undefined` when the shape isn't carrying one (non-note shapes).
 * The rule sees records at the server's schema version, so only the current field name exists.
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
function authorizeShape({ session, type, prev, next }: ShapeChange): TLShape | null {
	if (type === 'delete') return prev
	const before = type === 'create' ? null : getNoteAttribution(prev)
	const after = getNoteAttribution(next)
	if (after !== before && after != null && after !== session.userId) {
		if (type === 'update') return null
		const note = next as TLNoteShape
		return { ...note, props: { ...note.props, textLastEditedBy: session.userId } }
	}
	return next
}

/** The parts of the file rule, kept as an object so a test can stub one. */
export const fileRecordRules = {
	comments: createCommentAuthorizer<FileRecord, SessionMeta>({
		// Only authenticated users can write comments: authors are stored in Postgres with a
		// foreign key to the user table, so an anonymous author can't be represented. Tier
		// gating (view-only sessions) is the document lane; commenting follows it today.
		canComment: (session) => session.userId !== null && session.access.document === 'write',
	}),
	shape: authorizeShape,
}

const byLane = createLaneAccessAuthorizer<FileRecord, SessionMeta>(OBJECT_TYPES)

/**
 * The file room's one write rule: lane access first, then the shared comment rules, which force
 * authorship from the session's identity, then the note text attribution guard. Nothing can be
 * posted, pinned, reacted, or attributed in someone else's name.
 */
export function authorizeFileRecord(
	args: Parameters<TLSyncAuthorizer<FileRecord, SessionMeta>>[0]
): FileRecord | null {
	if (!byLane(args)) return null
	const { record } = args
	if (isCommentRecord(record)) return fileRecordRules.comments(args)
	if (record.typeName === 'shape') return fileRecordRules.shape(args as ShapeChange)
	return record
}
