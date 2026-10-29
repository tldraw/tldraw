import { UnknownRecord } from '@tldraw/store'
import {
	TLComment,
	TLCommentThread,
	createComment,
	createCommentThread,
	toRichText,
} from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import { getFileRoomAccess } from './authorizeFileRecord'
import { planMcpComment } from './mcpCommentWrite'
import { AGENT_COMMENT_HEADER, buildAgentCommentBody } from './routes/tla/boardTools'

const ME = 'user_me'
const body = buildAgentCommentBody('Looks good')

function makeRoom(records: object[]) {
	const byId = new Map<string, UnknownRecord>(
		records.map((record) => [(record as UnknownRecord).id, record as UnknownRecord])
	)
	return { get: (id: string) => byId.get(id), values: () => byId.values() }
}

const pageA = { typeName: 'page', id: 'page:a', name: 'One', index: 'a1', meta: {} }
const pageB = { typeName: 'page', id: 'page:b', name: 'Two', index: 'a2', meta: {} }
const frame = { typeName: 'shape', id: 'shape:frame', type: 'frame', parentId: 'page:b', props: {} }
const box = { typeName: 'shape', id: 'shape:box', type: 'geo', parentId: 'shape:frame', props: {} }

function thread(overrides: Partial<TLCommentThread> = {}): TLCommentThread {
	return {
		...createCommentThread({
			pageId: 'page:b' as TLCommentThread['pageId'],
			anchor: { type: 'point', x: 0, y: 0 },
			createdBy: 'user_other',
		}),
		...overrides,
	}
}

function plan(
	target: Parameters<typeof planMcpComment>[0]['target'],
	room: object[],
	isReadonly = false
) {
	return planMcpComment({ room: makeRoom(room), userId: ME, isReadonly, body, target })
}

describe('planMcpComment', () => {
	it('replies in an open thread as the caller, on the thread’s page', () => {
		const existing = thread()
		const result = plan({ kind: 'reply', threadId: existing.id }, [pageA, pageB, existing])
		if (!result.ok) throw new Error(`Expected a reply, got ${result.reason}`)
		expect(result.newThread).toBe(false)
		expect(result.threadId).toBe(existing.id)
		expect(result.pageId).toBe('page:b')
		expect(result.records).toHaveLength(1)
		const [comment] = result.records as TLComment[]
		expect(comment).toMatchObject({
			typeName: 'comment',
			id: result.commentId,
			threadId: existing.id,
			pageId: 'page:b',
			authorId: ME,
			isDeleted: false,
		})
		expect(comment.body.content[0]).toEqual({
			type: 'paragraph',
			content: [{ type: 'text', text: AGENT_COMMENT_HEADER, marks: [{ type: 'italic' }] }],
		})
	})

	it('starts a thread on a nested shape, on the page its ancestors are on', () => {
		const result = plan({ kind: 'shape', shapeId: 'shape:box' }, [pageA, pageB, frame, box])
		if (!result.ok) throw new Error(`Expected a new thread, got ${result.reason}`)
		expect(result.newThread).toBe(true)
		expect(result.pageId).toBe('page:b')
		const [newThread, comment] = result.records
		expect(newThread).toMatchObject({
			typeName: 'comment-thread',
			id: result.threadId,
			pageId: 'page:b',
			anchor: { type: 'shape', shapeId: 'shape:box', x: 1, y: 0, isPrecise: false },
			createdBy: ME,
			resolved: null,
		})
		expect(comment).toMatchObject({ threadId: result.threadId, authorId: ME, pageId: 'page:b' })
	})

	it('starts a thread at a page point, naming the page by index or id', () => {
		const byIndex = plan({ kind: 'point', page: { kind: 'ordinal', ordinal: 1 }, x: 40, y: -20 }, [
			pageB,
			pageA,
		])
		expect(byIndex).toMatchObject({ ok: true, pageId: 'page:b', newThread: true })
		if (!byIndex.ok) throw new Error('unreachable')
		expect((byIndex.records[0] as TLCommentThread).anchor).toEqual({ type: 'point', x: 40, y: -20 })

		const byId = plan({ kind: 'point', page: { kind: 'id', id: 'page:a' }, x: 0, y: 0 }, [
			pageA,
			pageB,
		])
		expect(byId).toMatchObject({ ok: true, pageId: 'page:a' })
	})

	it('refuses a view-only caller before anything else', () => {
		expect(plan({ kind: 'reply', threadId: 'comment-thread:missing' }, [pageA], true)).toEqual({
			ok: false,
			reason: 'comment_forbidden',
		})
		expect(plan({ kind: 'shape', shapeId: 'shape:box' }, [pageA, pageB, frame, box], true)).toEqual(
			{ ok: false, reason: 'comment_forbidden' }
		)
	})

	it('refuses a missing, deleted or resolved thread, and a reply to a non-thread id', () => {
		const deleted = thread({ isDeleted: true })
		const resolved = thread({ resolved: { at: 1, by: 'user_other' } })
		const notAThread = createComment({
			threadId: resolved.id,
			pageId: resolved.pageId,
			authorId: 'user_other',
			body: toRichText('x'),
		})
		const room = [pageB, deleted, resolved, notAThread]
		expect(plan({ kind: 'reply', threadId: 'comment-thread:missing' }, room)).toMatchObject({
			ok: false,
			reason: 'thread_not_found',
		})
		expect(plan({ kind: 'reply', threadId: deleted.id }, room)).toMatchObject({
			reason: 'thread_not_found',
		})
		expect(plan({ kind: 'reply', threadId: notAThread.id }, room)).toMatchObject({
			reason: 'thread_not_found',
		})
		expect(plan({ kind: 'reply', threadId: resolved.id }, room)).toEqual({
			ok: false,
			reason: 'thread_resolved',
			threadId: resolved.id,
		})
	})

	it('refuses a missing shape, a shape cut off from any page, and a missing page', () => {
		const orphan = { ...box, id: 'shape:orphan', parentId: 'shape:gone' }
		expect(plan({ kind: 'shape', shapeId: 'shape:nope' }, [pageA])).toEqual({
			ok: false,
			reason: 'shape_not_found',
			shapeId: 'shape:nope',
		})
		expect(plan({ kind: 'shape', shapeId: 'shape:orphan' }, [pageA, orphan])).toMatchObject({
			reason: 'shape_not_found',
		})
		// A page is not a shape, whatever id it is passed under.
		expect(plan({ kind: 'shape', shapeId: 'page:a' }, [pageA])).toMatchObject({
			reason: 'shape_not_found',
		})
		expect(
			plan({ kind: 'point', page: { kind: 'ordinal', ordinal: 2 }, x: 0, y: 0 }, [pageA, pageB])
		).toEqual({
			ok: false,
			reason: 'page_not_found',
			page: { kind: 'ordinal', ordinal: 2 },
			pageCount: 2,
		})
	})
})

describe('getFileRoomAccess', () => {
	const file = (shared: boolean, sharedLinkType = 'edit') => ({ shared, sharedLinkType })

	it('gives workspace members write whatever the link says', () => {
		expect(getFileRoomAccess(file(false), 'owner')).toBe('write')
		expect(getFileRoomAccess(file(true, 'view'), 'member')).toBe('write')
	})

	it('gives guests write only on an edit link, and nothing on an unshared board', () => {
		expect(getFileRoomAccess(file(true, 'edit'), null)).toBe('write')
		expect(getFileRoomAccess(file(true, 'view'), null)).toBe('read')
		// A legacy value fails closed.
		expect(getFileRoomAccess(file(true, 'legacy-something'), null)).toBe('read')
		expect(getFileRoomAccess(file(false), null)).toBe('none')
	})
})
