import {
	DB,
	MCP_AGENT_COMMENT_META_KEY,
	MENTIONABLE_VISITORS_LIMIT,
	McpAgentClient,
} from '@tldraw/dotcom-shared'
import { UnknownRecord } from '@tldraw/store'
import {
	TLComment,
	TLCommentAnchor,
	TLCommentThread,
	TLPageId,
	TLRichText,
	TLShape,
	commentRecordConfig,
	commentThreadRecordConfig,
	createComment,
	createCommentThread,
	isPage,
	isShape,
} from '@tldraw/tlschema'
import { Kysely } from 'kysely'
import { jsonArrayFrom } from 'kysely/helpers/postgres'
import { SessionMeta, authorizeFileRecord } from './authorizeFileRecord'
import { McpAgent } from './mcpAgentStorage'
import {
	CommentTarget,
	CommentWriteRefusal,
	MentionableUser,
	commentTextToRichText,
	getTextMentionIds,
} from './routes/tla/boardTools'

/**
 * The room's records, as a storage transaction exposes them. Lookups by id only: on
 * SQLiteSyncStorage, iterating values parses every record on the board.
 */
interface RoomRecords {
	get(id: string): UnknownRecord | undefined
}

export type PlannedMcpComment =
	| {
			ok: true
			/** The thread first when there is a new one: a comment whose thread is absent never renders. */
			records: Array<TLCommentThread | TLComment>
			threadId: string
			commentId: string
			pageId: string
			newThread: boolean
	  }
	| ({ ok: false } & CommentWriteRefusal)

/**
 * The records an MCP comment write puts in the room, checked against the room as it is now.
 *
 * Built the way the Codex plugin's `addComment` builds them in the editor, then passed through the
 * room's own `authorizeFileRecord` as a session of the caller's — the gate a socket write from
 * tldraw.com meets. A server-side storage write skips the authorizers, so without this the MCP route
 * would be the one way to post that they never see.
 *
 * `isReadonly` is the caller's tier from `getFileRoomAccess`, the same value a socket session for
 * them would carry.
 */
export function planMcpComment({
	room,
	userId,
	isReadonly,
	body,
	target,
	agent,
	agentClient,
}: {
	room: RoomRecords
	userId: string
	isReadonly: boolean
	body: TLRichText
	target: CommentTarget
	agent: McpAgent
	agentClient: McpAgentClient | null
}): PlannedMcpComment {
	// The authorizers below refuse this too; asked first so a view-only caller hears why, not that
	// the thread they named is missing.
	if (isReadonly) return { ok: false, reason: 'comment_forbidden' }

	let thread: TLCommentThread
	let newThread: boolean
	if (target.kind === 'reply') {
		const existing = room.get(target.threadId) as TLCommentThread | undefined
		if (!existing || existing.typeName !== 'comment-thread' || existing.isDeleted) {
			return { ok: false, reason: 'thread_not_found', threadId: target.threadId }
		}
		if (existing.resolved) return { ok: false, reason: 'thread_resolved', threadId: existing.id }
		thread = existing
		newThread = false
	} else {
		const placed = placeNewThread(room, target)
		if (!placed.ok) return placed
		thread = createCommentThread({
			pageId: placed.pageId,
			anchor: placed.anchor,
			createdBy: userId,
		})
		newThread = true
	}

	const comment = createComment({
		threadId: thread.id,
		pageId: thread.pageId,
		authorId: userId,
		body,
	})

	const session = {
		sessionId: `mcp:${userId}`,
		isReadonly,
		meta: { storeId: `mcp:${userId}`, userId } satisfies SessionMeta,
	}
	const authorizeComment = authorizeFileRecord.comment
	const authorizeThread = authorizeFileRecord['comment-thread']
	if (!authorizeComment || !authorizeThread) throw new Error('comment authorizers are missing')
	const authorizedComment = authorizeComment({ session, type: 'create', prev: null, next: comment })
	const authorizedThread = newThread
		? authorizeThread({ session, type: 'create', prev: null, next: thread })
		: thread
	if (!authorizedComment || !authorizedThread) return { ok: false, reason: 'comment_forbidden' }
	// How tldraw.com tells an agent's comment from its user's, and which agent: the comment is the
	// user's own, so nothing else distinguishes it. Stamped after the authorizers, which refuse it
	// from a client so that only this write can badge a comment as an agent's.
	const agentComment: TLComment = {
		...authorizedComment,
		meta: {
			...authorizedComment.meta,
			[MCP_AGENT_COMMENT_META_KEY]: { id: agent.id, name: agent.name, client: agentClient },
		},
	}

	// The room validates what a client pushes; a storage write is trusted as is, so validate here.
	const records: Array<TLCommentThread | TLComment> = [
		...(newThread
			? [commentThreadRecordConfig.validator.validate(authorizedThread) as TLCommentThread]
			: []),
		commentRecordConfig.validator.validate(agentComment) as TLComment,
	]
	return {
		ok: true,
		records,
		threadId: thread.id,
		commentId: comment.id,
		pageId: thread.pageId,
		newThread,
	}
}

function placeNewThread(
	room: RoomRecords,
	target: Exclude<CommentTarget, { kind: 'reply' }>
): { ok: true; pageId: TLPageId; anchor: TLCommentAnchor } | ({ ok: false } & CommentWriteRefusal) {
	if (target.kind === 'shape') {
		const shape = room.get(target.shapeId)
		if (!isShape(shape)) return { ok: false, reason: 'shape_not_found', shapeId: target.shapeId }
		const pageId = getAncestorPageId(room, shape)
		if (!pageId) return { ok: false, reason: 'shape_not_found', shapeId: target.shapeId }
		// An imprecise anchor: the thread is about the shape as a whole, and tldraw.com keeps its pin
		// at the shape's corner as it moves and resizes. A precise one needs the shape's geometry,
		// which only an editor has.
		return {
			ok: true,
			pageId,
			anchor: { type: 'shape', shapeId: shape.id, x: 1, y: 0, isPrecise: false },
		}
	}

	const page = room.get(target.pageId)
	if (!isPage(page)) return { ok: false, reason: 'page_not_found', pageId: target.pageId }
	return { ok: true, pageId: page.id, anchor: { type: 'point', x: target.x, y: target.y } }
}

function getAncestorPageId(room: RoomRecords, shape: TLShape): TLPageId | null {
	let parentId: string = shape.parentId
	// Bounded, and guarded against a cyclic parentId in a corrupt room.
	for (let depth = 0; depth < 100; depth++) {
		const parent = room.get(parentId)
		if (isPage(parent)) return parent.id
		if (!isShape(parent)) return null
		parentId = parent.parentId
	}
	return null
}

/**
 * Who `userId` may mention in a comment on `fileId`: the roster tldraw.com's @-picker offers them
 * there, under the same rules its synced queries apply, so an agent can mention exactly whoever its
 * user could and learns nothing more about who is on the board.
 *
 * - The members of the workspace that owns the file, only if the caller is one of them
 *   (`workspaceMemberships`).
 * - Its most recent visitors besides the caller, only if the caller has opened the file themselves
 *   (`fileVisitors`).
 *
 * With `ids`, only those of them that are on the roster, so checking a comment's few mentions
 * doesn't read the whole of it. Names are the ones Postgres keeps in step with each user's row.
 */
export async function selectMentionableUsers(
	db: Kysely<DB>,
	{ fileId, userId, ids }: { fileId: string; userId: string; ids?: readonly string[] }
): Promise<MentionableUser[]> {
	if (ids && !ids.length) return []
	const { members, visitors } = await db
		.selectNoFrom((eb) => [
			jsonArrayFrom(
				eb
					.selectFrom('group_user')
					.innerJoin('file', 'file.owningGroupId', 'group_user.groupId')
					.select(['group_user.userId as id', 'group_user.userName as name'])
					.where('file.id', '=', fileId)
					.where(({ exists, selectFrom }) =>
						exists(
							selectFrom('group_user as caller')
								.select('caller.userId')
								.whereRef('caller.groupId', '=', 'file.owningGroupId')
								.where('caller.userId', '=', userId)
						)
					)
					.$if(!!ids, (qb) => qb.where('group_user.userId', 'in', ids ?? []))
					.orderBy('group_user.userName')
			).as('members'),
			jsonArrayFrom(
				eb
					.selectFrom((sub) =>
						// The most recent visitors first, then the ids among them: a visitor past the limit
						// isn't one tldraw.com offers.
						sub
							.selectFrom('file_visitor')
							.select(['userId as id', 'userName as name', 'lastVisitAt'])
							.where('fileId', '=', fileId)
							.where('userId', '!=', userId)
							.where(({ exists, selectFrom }) =>
								exists(
									selectFrom('file_state')
										.select('file_state.userId')
										.where('file_state.fileId', '=', fileId)
										.where('file_state.userId', '=', userId)
								)
							)
							.orderBy('lastVisitAt', 'desc')
							.limit(MENTIONABLE_VISITORS_LIMIT)
							.as('recent')
					)
					.select(['recent.id', 'recent.name'])
					.$if(!!ids, (qb) => qb.where('recent.id', 'in', ids ?? []))
					.orderBy('recent.lastVisitAt', 'desc')
			).as('visitors'),
		])
		.executeTakeFirstOrThrow()
	const byId = new Map<string, MentionableUser>()
	for (const person of [...members, ...visitors]) {
		if (!byId.has(person.id)) byId.set(person.id, { id: person.id, name: person.name || 'Someone' })
	}
	return [...byId.values()]
}

/**
 * An agent's comment text as rich text, with each `@[name](id)` as a mention. Only the id is taken
 * from the agent: each must be on the caller's roster ({@link selectMentionableUsers}), and is named
 * from our records, never from the text.
 *
 * Only for a caller already let in to comment: which ids pass says who is on the board.
 */
export async function resolveCommentMentions(
	db: Kysely<DB>,
	{ fileId, userId, text }: { fileId: string; userId: string; text: string }
): Promise<{ ok: true; body: TLRichText } | ({ ok: false } & CommentWriteRefusal)> {
	const ids = getTextMentionIds(text)
	const names = new Map<string, string>()
	if (ids.length) {
		for (const person of await selectMentionableUsers(db, { fileId, userId, ids })) {
			names.set(person.id, person.name)
		}
		const unknown = ids.filter((id) => !names.has(id))
		if (unknown.length) return { ok: false, reason: 'unknown_mention', userIds: unknown }
	}
	return { ok: true, body: commentTextToRichText(text, names) }
}
