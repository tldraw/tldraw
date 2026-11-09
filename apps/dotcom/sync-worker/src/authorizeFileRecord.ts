import { createCommentAuthorizer, getOwningPage, isCommentRecord } from '@tldraw/sync-collaboration'
import {
	createAccessAuthorizer,
	perRecord,
	TLRecordChange,
	TLSyncAuthorizer,
	TLSyncAuthorizerSession,
	TLSyncRefusal,
	TLSyncTransform,
} from '@tldraw/sync-core'
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

// Record types served through the room's object store: persisted in Postgres via the
// comment outbox rather than the R2 document blob, and judged by the shared comment rules below.
export const OBJECT_TYPES = [
	'comment-thread',
	'comment',
	'comment-reaction',
	'access-grant',
] as const

// The file room's record union, widened to include the object-store comment records.
export type FileRecord = TLRecord | TLComment | TLCommentThread | TLCommentReaction

type FileSession = TLSyncAuthorizerSession<SessionMeta>

/**
 * A note's text attribution, or `undefined` when the shape isn't carrying one (non-note shapes).
 * The rule sees records at the server's schema version, so only the current field name exists.
 */
function getNoteAttribution(shape: TLShape): string | null | undefined {
	if (shape.type !== 'note') return undefined
	return (shape as TLNoteShape).props.textLastEditedBy
}

/**
 * Slurped notes can carry a browser-local author ID. Refusing their creates drops the notes
 * from the imported board, so re-stamp foreign attribution from the session instead.
 */
function stampNoteAttribution(shape: TLShape, session: FileSession): TLShape {
	const author = getNoteAttribution(shape)
	if (author == null || author === session.meta.userId) return shape
	const note = shape as TLNoteShape
	return { ...note, props: { ...note.props, textLastEditedBy: session.meta.userId } }
}

/** An update may keep a note's existing author, but may only claim the session's own identity. */
function authorizeShape(change: TLRecordChange<FileRecord>, session: FileSession): string | null {
	if (
		change.type !== 'update' ||
		change.prev.typeName !== 'shape' ||
		change.next.typeName !== 'shape'
	) {
		return null
	}
	const before = getNoteAttribution(change.prev)
	const after = getNoteAttribution(change.next)
	if (after !== before && after != null && after !== session.meta.userId) {
		return 'note attribution must be your own'
	}
	return null
}

// SPIKE: role grants are written by the server only.
const grantsAreServerManaged = perRecord<FileRecord, SessionMeta>((change) =>
	(change.record as { typeName: string }).typeName === 'access-grant'
		? 'role grants are managed by the server'
		: null
)

// SPIKE: signed-out visitors are "students". A page is theirs when its meta says so
// (`studentEditable`, set by a teacher); they may not change that policy themselves.
const students = perRecord<FileRecord, SessionMeta>((change, { session, before, after }) => {
	if (session.meta.userId !== null) return null
	if (
		change.type === 'update' &&
		change.next.typeName === 'page' &&
		change.prev.typeName === 'page' &&
		change.prev.meta.studentEditable !== change.next.meta.studentEditable
	) {
		return 'students cannot change page policy'
	}
	const ends = [
		[change.type === 'create' ? null : change.prev, before],
		[change.type === 'delete' ? null : change.next, after],
	] as const
	for (const [record, get] of ends) {
		if (!record) continue
		const owning = getOwningPage(get, record)
		if (owning.page && owning.page.meta.studentEditable !== true) {
			return 'students can only edit pages shared with them'
		}
	}
	return null
})

/** The parts of the file rule, kept as an object so a test can stub one. */
export const fileRecordRules = {
	comments: createCommentAuthorizer<FileRecord, SessionMeta>({
		getUserId: (session) => session.meta.userId,
		// Only authenticated users can write comments: authors are stored in Postgres with a
		// foreign key to the user table, so an anonymous author can't be represented. Tier
		// gating (view-only sessions) is document access; commenting follows it today.
		canComment: (session) => session.meta.userId !== null && session.access.document === 'write',
	}),
	// Comment records are the comment rule's alone: its `canComment` is their access check.
	access: createAccessAuthorizer<FileRecord, SessionMeta>(OBJECT_TYPES, {
		except: isCommentRecord,
	}),
	shape: authorizeShape,
}

const shapes = perRecord<FileRecord, SessionMeta>((change, { session }) =>
	fileRecordRules.shape(change, session)
)

/** Stamps authorship from the session on created comment records and imported notes. */
export function transformFileRecord(
	args: Parameters<TLSyncTransform<FileRecord, SessionMeta>>[0]
): FileRecord {
	const record = fileRecordRules.comments.transform(args)
	return record.typeName === 'shape' ? stampNoteAttribution(record, args.session) : record
}

/**
 * The file room's one write rule: session access first, then the shared comment rules, which keep
 * authorship with the session's identity, then the note text attribution guard. Nothing can be
 * posted, pinned, reacted, or attributed in someone else's name.
 */
export function authorizeFileRecord(
	args: Parameters<TLSyncAuthorizer<FileRecord, SessionMeta>>[0]
): TLSyncRefusal | null {
	return (
		grantsAreServerManaged(args) ??
		fileRecordRules.access(args) ??
		fileRecordRules.comments.authorize(args) ??
		shapes(args) ??
		students(args)
	)
}
