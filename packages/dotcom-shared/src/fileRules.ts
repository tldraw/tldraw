import {
	Authorize,
	AuthorizeContext,
	AuthorizeResult,
	combineAuthorize,
	runAuthorize,
} from '@tldraw/store'
import { createCommentAuthorize } from '@tldraw/sync-collaboration'
import { TLNoteShape, TLRecord, TLShape } from '@tldraw/tlschema'

/**
 * The actor of the file rules. On the server it is each socket's session meta. In the editor it
 * is the current user, so the editor asks the same rules as the room.
 */
export interface SessionMeta {
	storeId: string
	/** The signed-in user, or null for a guest. */
	userId: string | null
	/** A view-only session (a view link, or a guest on a file that guests may only view). */
	isReadonly: boolean
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
 * Slurped notes can carry a browser-local author ID. Denying their creates drops the notes
 * from the imported board, so re-stamp foreign attribution from the actor instead. Updates
 * may keep an existing author but cannot claim a new identity other than the actor's user.
 */
export function authorizeNoteAttribution(
	ctx: AuthorizeContext<TLRecord, SessionMeta>
): AuthorizeResult<TLRecord> {
	if (ctx.record?.typeName !== 'shape') return undefined
	if (ctx.action !== 'create' && ctx.action !== 'update') return undefined
	const next = ctx.action === 'create' ? ctx.record : ctx.next
	if (!next || next.typeName !== 'shape') return undefined
	const before = ctx.action === 'create' ? null : getNoteAttribution(ctx.record)
	const after = getNoteAttribution(next)
	if (after === before || after == null || after === ctx.actor.userId) return undefined
	if (ctx.action === 'update') return false
	const note = next as TLNoteShape
	return { record: { ...note, props: { ...note.props, textLastEditedBy: ctx.actor.userId } } }
}

/** View-only sessions read comments but cannot write them. */
function authorizeViewOnlyComments(
	ctx: AuthorizeContext<TLRecord, SessionMeta>
): AuthorizeResult<TLRecord> {
	if (ctx.action === 'comments:write' && ctx.actor.isReadonly) return false
	return undefined
}

/**
 * Every permission rule of a file, in one function: comment, thread, and reaction authorship (from
 * the shared comment rules), view-only sessions, and note text attribution. Nothing can be
 * posted, pinned, or reacted in someone else's name. The file room and the editor both run it.
 */
export const authorizeFileRecord: Authorize<TLRecord, SessionMeta> = combineAuthorize(
	authorizeViewOnlyComments,
	createCommentAuthorize<TLRecord, SessionMeta>({ getUserId: (meta) => meta.userId }),
	authorizeNoteAttribution
)

/**
 * The object lane (comments) is writable when the file rules allow `comments:write`: for
 * signed-in users only, because a comment author is a foreign key to the user table, and not for
 * view-only sessions.
 */
export function getObjectAccess(meta: SessionMeta): 'read' | 'write' {
	const decision = runAuthorize<TLRecord, SessionMeta>(
		authorizeFileRecord,
		{ action: 'comments:write', record: undefined, next: undefined },
		{ actor: meta, get: () => undefined }
	)
	return decision.allowed ? 'write' : 'read'
}
