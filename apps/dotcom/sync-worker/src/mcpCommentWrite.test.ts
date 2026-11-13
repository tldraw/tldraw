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
import { planMcpComment, resolveCommentMentions } from './mcpCommentWrite'
import { createFakeKysely } from './test/fakeKysely'

const ME = 'user_me'
const body = toRichText('Looks good')

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
	return planMcpComment({
		room: makeRoom(room),
		userId: ME,
		isReadonly,
		body,
		target,
		agent: { id: 'mcp-agent:test', ownerUserId: ME, name: 'Claude' },
		agentClient: 'claude',
	})
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
		expect(comment.body).toEqual(body)
		expect(comment.meta).toEqual({
			mcpAgent: { id: 'mcp-agent:test', name: 'Claude', client: 'claude' },
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

	it('starts a thread at a point on the page it names', () => {
		const result = plan({ kind: 'point', pageId: 'page:b', x: 40, y: -20 }, [pageA, pageB])
		expect(result).toMatchObject({ ok: true, pageId: 'page:b', newThread: true })
		if (!result.ok) throw new Error('unreachable')
		expect((result.records[0] as TLCommentThread).anchor).toEqual({ type: 'point', x: 40, y: -20 })
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
		expect(plan({ kind: 'point', pageId: 'page:c', x: 0, y: 0 }, [pageA, pageB])).toEqual({
			ok: false,
			reason: 'page_not_found',
			pageId: 'page:c',
		})
		// A shape is not a page, whatever id it is passed under.
		expect(plan({ kind: 'point', pageId: 'shape:box', x: 0, y: 0 }, [pageA, box])).toMatchObject({
			reason: 'page_not_found',
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

describe('resolveCommentMentions', () => {
	const FILE = 'file_1'
	function resolve(text: string, roster: { members?: object[]; visitors?: object[] } = {}) {
		const fake = createFakeKysely([[{ members: [], visitors: [], ...roster }]])
		const result = resolveCommentMentions(fake.db, { fileId: FILE, userId: ME, text })
		return { fake, result }
	}

	it('mentions by id, named from our records rather than the text', async () => {
		const { result } = resolve('@[The Boss](user_a) take a look', {
			members: [{ id: 'user_a', name: 'Ada Lovelace' }],
		})
		expect(await result).toEqual({
			ok: true,
			body: {
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [
							{ type: 'mention', attrs: { id: 'user_a', label: 'Ada Lovelace' } },
							{ type: 'text', text: ' take a look' },
						],
					},
				],
			},
		})
	})

	it('refuses the ids the caller’s roster does not have, and only those', async () => {
		const { result } = resolve('@[Ada](user_a) and @[Eve](user_eve) and @[Gus](user_g)', {
			members: [{ id: 'user_a', name: 'Ada' }],
			visitors: [{ id: 'user_g', name: '' }],
		})
		expect(await result).toEqual({ ok: false, reason: 'unknown_mention', userIds: ['user_eve'] })
	})

	it('asks Postgres nothing for a comment that mentions nobody', async () => {
		const { fake, result } = resolve('no mentions here')
		expect(await result).toMatchObject({ ok: true })
		expect(fake.queries).toEqual([])
	})

	// The rules of tldraw.com's own synced queries: members only for a member of the owning
	// workspace, visitors only for someone who has opened the file, never the caller as a visitor.
	it('looks up only the mentioned ids, under the caller’s own roster rules', async () => {
		const { fake, result } = resolve('@[Ada](user_a) @[Eve](user_eve)')
		await result
		const [query] = fake.queries
		expect(query.sql).toContain('"group_user" as "caller"')
		expect(query.sql).toContain('"file_state"')
		expect(query.sql).toMatch(/"userId" != \$\d+/)
		expect(query.parameters).toEqual(expect.arrayContaining([FILE, ME, 'user_a', 'user_eve']))
	})
})
