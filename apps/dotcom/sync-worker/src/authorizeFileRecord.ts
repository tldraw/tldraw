import { UnknownRecord } from '@tldraw/store'
import { TLRecordAuthorizer, TLRecordAuthorizers } from '@tldraw/sync-core'
import { TLComment, TLCommentThread, TLNoteShape, TLRecord, TLShape } from '@tldraw/tlschema'

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
 * Threads stay editable by anyone with access so they can be resolved and reopened, but resolution
 * is itself an attribution — `resolved.by` renders as "Resolved by X". Whether set at create or
 * changed by an update, a non-null resolution must be attributed to the session's own user.
 */
const authorizeThread: TLRecordAuthorizer<TLCommentThread, SessionMeta> = (args) => {
	const result = authorizeThreadBase(args)
	if (!result) return null
	if (args.type === 'create') {
		// A fresh thread must not arrive pre-resolved in someone else's name (deletes are allowed
		// for cascade cleanup, so delete + re-put with a forged resolution is otherwise possible).
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
 * Notes stamp `textLastEditedBy` client-side: the current user on text edit, `null` when the text
 * is emptied or the editor is anonymous. Enforce that here: when an update changes the attribution,
 * the new value must be `null` or the session's own user.
 *
 * Creates pass through untouched — duplication and copy/paste legitimately carry another user's
 * attribution, so a forged create is indistinguishable from a duplication and strictness on create
 * would only break duplication. The delete + re-create loophole this leaves is accepted by design.
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
 * Force comment and thread authorship from the session's authenticated identity, so nobody can post
 * in — or edit a comment into — someone else's name, and guard note text attribution so edits
 * can't be pinned on another user.
 */
export const authorizeFileRecord: TLRecordAuthorizers<FileRecord, SessionMeta> = {
	comment: authorizeAuthored<TLComment>('authorId', { ownerOnlyUpdate: true }),
	'comment-thread': authorizeThread,
	shape: authorizeShape,
}
