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
import { SessionMeta, authorizeFileRecord } from './authorizeFileRecord'
import { CommentTarget, CommentWriteRefusal, enumeratePages } from './routes/tla/boardTools'

/** The room's records, as a storage transaction exposes them. */
interface RoomRecords {
	get(id: string): UnknownRecord | undefined
	values(): Iterable<UnknownRecord>
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
}: {
	room: RoomRecords
	userId: string
	isReadonly: boolean
	body: TLRichText
	target: CommentTarget
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

	// The room validates what a client pushes; a storage write is trusted as is, so validate here.
	const records: Array<TLCommentThread | TLComment> = [
		...(newThread
			? [commentThreadRecordConfig.validator.validate(authorizedThread) as TLCommentThread]
			: []),
		commentRecordConfig.validator.validate(authorizedComment) as TLComment,
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

	const pages = enumeratePages([...room.values()])
	const selector = target.page
	const page =
		selector.kind === 'id' ? pages.find((p) => p.id === selector.id) : pages[selector.ordinal]
	if (!page) {
		return { ok: false, reason: 'page_not_found', page: target.page, pageCount: pages.length }
	}
	return {
		ok: true,
		pageId: page.id as TLPageId,
		anchor: { type: 'point', x: target.x, y: target.y },
	}
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
