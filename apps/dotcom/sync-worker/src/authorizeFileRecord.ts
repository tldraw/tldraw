import { UnknownRecord } from '@tldraw/store'
import { TLRecordAuthorizer, TLRecordAuthorizers } from '@tldraw/sync-core'
import {
	TLComment,
	TLCommentReaction,
	TLCommentThread,
	TLNoteShape,
	TLRecord,
	TLShape,
	createCommentReactionId,
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

const authorizeReactionBase = authorizeAuthored<TLCommentReaction>('userId', {
	ownerOnlyUpdate: true,
})

/**
 * A reaction's id is derived from its comment and user (see `createCommentReactionId`), which is
 * what makes "one reaction per user per comment" a fact rather than a hope. The base rule already
 * stamps `userId` from the session and lets only the owner change a reaction — but the id and the
 * comment it points at are client-supplied, so this wrapper adds two things:
 *
 * - On **create**, the id must be the canonical id for `commentId` + the session's user. Without
 *   this a forged client could create a record at another user's id slot (their later reaction
 *   would be an owner-only update to a record they don't own, so it's rejected — locking them out
 *   of reacting to that comment), or push two distinct ids for one (comment, user) pair that
 *   collide on the table's UNIQUE (commentId, userId) at drain time and wedge the outbox.
 *
 * - On **update**, the comment a reaction points at is immutable: `commentId` and its denormalized
 *   `threadId`/`pageId` may not change. The id encodes `commentId` and can't change on update (it's
 *   the record's identity), so moving the reaction to a different comment would leave the id
 *   disagreeing with `commentId` — and the drain, which upserts these columns on id conflict, could
 *   then land two rows on one (commentId, userId) and hit the same unhandled unique violation. Only
 *   the emoji (and its `createdAt`) may change on a re-react.
 */
const authorizeReaction: TLRecordAuthorizer<TLCommentReaction, SessionMeta> = (args) => {
	const result = authorizeReactionBase(args)
	if (!result) return null
	if (args.type === 'create') {
		// userId is non-null here: the base rule rejects a create from a session with no identity.
		const { session, next } = args
		if (next.id !== createCommentReactionId(next.commentId, session.meta.userId!)) return null
	}
	if (args.type === 'update') {
		const { prev, next } = args
		if (next.commentId !== prev.commentId) return null
		if (next.threadId !== prev.threadId) return null
		if (next.pageId !== prev.pageId) return null
	}
	return result
}

/**
 * Force comment and thread authorship from the session's identity, and guard note text
 * attribution, so nothing can be posted or pinned in someone else's name.
 */
export const authorizeFileRecord: TLRecordAuthorizers<FileRecord, SessionMeta> = {
	comment: authorizeAuthored<TLComment>('authorId', { ownerOnlyUpdate: true }),
	'comment-thread': authorizeThread,
	// A reaction is one user's own record, so the standard attribution rules mostly cover it:
	// `userId` is stamped from the session and only the reactor can change their reaction. The
	// wrapper adds the id check that ties the record to its (comment, user) slot — see above.
	'comment-reaction': authorizeReaction,
	shape: authorizeShape,
}
