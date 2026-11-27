import {
	FileCapability,
	MCP_AGENT_COMMENT_META_KEY,
	Role,
	TlaFile,
	can,
} from '@tldraw/dotcom-shared'
import { RecordsDiff } from '@tldraw/store'
import { createCommentAuthorizers } from '@tldraw/sync-collaboration'
import { TLRecordAuthorizer, TLRecordAuthorizers } from '@tldraw/sync-core'
import {
	TLComment,
	TLCommentReaction,
	TLCommentThread,
	TLNoteShape,
	TLCheckResult,
	TLRecord,
	TLShape,
} from '@tldraw/tlschema'
import { isEqual } from '@tldraw/utils'

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

const commentAuthorizers = createCommentAuthorizers<SessionMeta>({
	getUserId: (session) => session.meta.userId,
})

function getAgentMeta(comment: TLComment): unknown {
	return (comment.meta as Record<string, unknown>)[MCP_AGENT_COMMENT_META_KEY]
}

/**
 * `meta.mcpAgent` is what badges a comment as an agent's, and only the MCP server's own write may
 * put it there; without this, anyone could post a comment that reads as an agent's on their behalf,
 * or relabel their own. A client write may keep it unchanged or drop it, but not add or change it.
 * The MCP write stamps it after this check (see `planMcpComment`); server-side writes skip the
 * authorizers anyway.
 */
const authorizeComment: TLRecordAuthorizer<TLComment, SessionMeta> = (args) => {
	const after = args.type === 'delete' ? undefined : getAgentMeta(args.next)
	if (after !== undefined) {
		if (args.type === 'create') return null
		if (args.type === 'update' && !isEqual(after, getAgentMeta(args.prev))) return null
	}
	return commentAuthorizers.comment!(args)
}

/**
 * Force comment, thread, and reaction authorship from the session's identity (via the shared
 * commenting authorizers), and guard note text attribution, so nothing can be posted, pinned,
 * or reacted in someone else's name, or badged as an agent's.
 */
export const authorizeFileRecord = {
	...commentAuthorizers,
	comment: authorizeComment,
	shape: authorizeShape,
} satisfies TLRecordAuthorizers<FileRecord, SessionMeta>

/**
 * What a signed-in user may do in an app file's room: nothing, read (canvas and comments), or edit
 * (canvas and comments). The one statement of the rule, read by the socket connect and by the MCP
 * server's comment write, so an agent can comment exactly where its user could.
 *
 * Guests get canvas write, and with it comments (see `checkFileDiff`),
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

const COMMENT_TYPES: ReadonlySet<string> = new Set([
	'comment-thread',
	'comment',
	'comment-reaction',
])

/**
 * The room's diff check: each changed record needs a capability, and the push is rejected with the
 * first one the session lacks. The client runs its own copy (see `TlaFileSyncHost`).
 */
export function checkFileDiff(
	diff: RecordsDiff<FileRecord>,
	granted: readonly FileCapability[],
	userId: string | null
): TLCheckResult {
	const changes = [
		...Object.values(diff.added).map((r) => ['create', r.typeName, r.id] as const),
		...Object.values(diff.updated).map(([from]) => ['edit', from.typeName, from.id] as const),
		...Object.values(diff.removed).map((r) => ['delete', r.typeName, r.id] as const),
	]
	for (const [change, typeName, id] of changes) {
		// A person's own name and colour; otherwise a viewer's join is rejected.
		if (typeName === 'user' && change !== 'delete' && id === `user:${userId}`) continue
		let capability: FileCapability
		if (COMMENT_TYPES.has(typeName)) {
			capability = 'comment'
		} else {
			switch (typeName as string) {
				case 'shape':
				case 'asset':
					capability = `${change}-shape`
					break
				case 'page':
					capability = `${change}-page`
					break
				case 'document':
					capability = 'edit-page'
					break
				// Otherwise a bound arrow detaches for someone who may edit shapes.
				case 'binding':
					capability = 'edit-shape'
					break
				// A type added later; otherwise it is open to viewers.
				default:
					capability = 'edit-shape'
			}
		}
		if (!granted.includes(capability)) return { reason: capability }
	}
	return null
}
