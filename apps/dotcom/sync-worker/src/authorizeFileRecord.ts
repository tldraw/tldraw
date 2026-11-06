import { Authorize, AuthorizeContext, AuthorizeResult, combineAuthorize } from '@tldraw/store'
import { createCommentAuthorize } from '@tldraw/sync-collaboration'
import { TLNoteShape, TLRecord, TLShape } from '@tldraw/tlschema'

/** Per-session metadata attached to each socket: the local store id and the authenticated user (if any). */
export interface SessionMeta {
	storeId: string
	userId: string | null
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

/**
 * Every permission rule of a file room, in one function: comment, thread, and reaction
 * authorship (from the shared comment rules), and note text attribution. Nothing can be posted,
 * pinned, or reacted in someone else's name.
 */
export const authorizeFileRecord: Authorize<TLRecord, SessionMeta> = combineAuthorize(
	createCommentAuthorize<TLRecord, SessionMeta>({ getUserId: (meta) => meta.userId }),
	authorizeNoteAttribution
)

/**
 * The object lane (comments) is writable only for signed-in users, because a comment author is a
 * foreign key to the user table, and only for sessions that may edit, because view-only links
 * read comments but cannot write them.
 */
export function getObjectAccess(opts: {
	userId: string | null
	isReadonly: boolean
}): 'read' | 'write' {
	return opts.userId && !opts.isReadonly ? 'write' : 'read'
}
