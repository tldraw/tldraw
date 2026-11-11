import {
	composeRules,
	createStructureRule,
	getOwningPage,
	getMissingPermission,
} from '@tldraw/permissions'
import {
	getTlsyncProtocolVersion,
	InMemorySyncStorage,
	perRecord,
	RecordOpType,
	TLSocketRoom,
	TLSyncRule,
} from '@tldraw/sync-core'
import { createShapeId, createTLSchema, PageRecordType, TLPageId, TLRecord } from '@tldraw/tlschema'
import { describe, expect, it, vi } from 'vitest'

interface Meta {
	userId: string
	role: 'teacher' | 'student'
}

const schema = createTLSchema()

// Students may change only what lives on their own page, and never a page's policy. `prev` is
// judged on the board before the push, `next` on the board after it.
const classroomRule: TLSyncRule<TLRecord, Meta> = perRecord(
	({ prev, next }, { session, before, after }) => {
		if (session.meta.role === 'teacher') return null
		if (
			next?.typeName === 'page' &&
			prev?.typeName === 'page' &&
			prev.meta.ownerId !== next.meta.ownerId
		) {
			return 'only teachers assign pages'
		}
		for (const [end, get] of [
			[prev, before],
			[next, after],
		] as const) {
			if (!end) continue
			const owning = getOwningPage(get, end)
			if (!owning.page) return 'dangling parent'
			if ((owning.page.meta as { ownerId?: string }).ownerId !== session.meta.userId) {
				return 'not your page'
			}
		}
		return null
	}
)

function makeSocket() {
	return {
		send: vi.fn(),
		close: vi.fn(),
		readyState: WebSocket.OPEN,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	}
}

function connect(
	room: TLSocketRoom<TLRecord, Meta>,
	sessionId: string,
	meta: Meta,
	roomSchema = schema,
	permissions?: string[]
) {
	const socket = makeSocket()
	room.handleSocketConnect({ sessionId, socket, meta, permissions })
	room.handleSocketMessage(
		sessionId,
		JSON.stringify({
			type: 'connect',
			connectRequestId: 'connect-' + sessionId,
			lastServerClock: 0,
			protocolVersion: getTlsyncProtocolVersion(),
			schema: roomSchema.serialize(),
		})
	)
	socket.send.mockClear()
	return socket
}

function push(room: TLSocketRoom<TLRecord, Meta>, sessionId: string, diff: Record<string, any>) {
	room.handleSocketMessage(sessionId, JSON.stringify({ type: 'push', clientClock: 1, diff }))
}

function pushResult(socket: ReturnType<typeof makeSocket>) {
	return socket.send.mock.calls
		.map((c) => JSON.parse(c[0]))
		.flatMap((m) => (m.type === 'data' ? m.data : [m]))
		.find((m) => m.type === 'push_result')
}

function page(id: string, ownerId: string) {
	return PageRecordType.create({
		id: id as TLPageId,
		name: ownerId,
		index: 'a1' as any,
		meta: { ownerId },
	})
}

function frame(id: string, parentId: string) {
	return schema.types.shape.create({
		id: createShapeId(id),
		type: 'frame',
		parentId: parentId as any,
		index: 'a1' as any,
		props: { w: 100, h: 100, name: '', color: 'black' },
	})
}

function makeRoom(authorize: TLSyncRule<TLRecord, Meta> = classroomRule) {
	const storage = new InMemorySyncStorage<TLRecord>({
		snapshot: {
			clock: 0,
			documentClock: 0,
			schema: schema.serialize(),
			documents: [page('page:a', 'A'), page('page:b', 'B'), frame('frame-on-b', 'page:b')].map(
				(state) => ({ state, lastChangedClock: 0 })
			),
		},
	})
	return new TLSocketRoom<TLRecord, Meta>({ schema, storage, authorize })
}

describe('a page-scoped rule through TLSocketRoom', () => {
	it('lets a student draw inside a frame on their own page', () => {
		const room = makeRoom()
		const socket = connect(room, 'b', { userId: 'B', role: 'student' })
		const shape = frame('inside', 'shape:frame-on-b')
		push(room, 'b', { [shape.id]: [RecordOpType.Put, shape] })
		expect(room.getRecord(shape.id)).toBeDefined()
		expect(pushResult(socket)).toMatchObject({ action: 'commit' })
	})

	it('refuses a student drawing inside a frame on another student page', () => {
		const room = makeRoom()
		const socket = connect(room, 'a', { userId: 'A', role: 'student' })
		const shape = frame('intruder', 'shape:frame-on-b')
		push(room, 'a', { [shape.id]: [RecordOpType.Put, shape] })
		expect(room.getRecord(shape.id)).toBeUndefined()
		expect(pushResult(socket)).toMatchObject({
			action: 'discard',
			refused: { reason: 'not your page', ids: [shape.id] },
		})
	})

	it('refuses a student taking over a page by rewriting its policy', () => {
		const room = makeRoom()
		connect(room, 'a', { userId: 'A', role: 'student' })
		push(room, 'a', {
			'page:b': [RecordOpType.Patch, { meta: ['put', { ownerId: 'A' }] }],
		})
		expect((room.getRecord('page:b') as any).meta.ownerId).toEqual('B')
	})

	it('lets the teacher reassign a page, and the new owner then edits it', () => {
		const room = makeRoom()
		connect(room, 't', { userId: 'T', role: 'teacher' })
		push(room, 't', { 'page:b': [RecordOpType.Patch, { meta: ['put', { ownerId: 'A' }] }] })
		expect((room.getRecord('page:b') as any).meta.ownerId).toEqual('A')

		const socket = connect(room, 'a', { userId: 'A', role: 'student' })
		const shape = frame('now-mine', 'shape:frame-on-b')
		push(room, 'a', { [shape.id]: [RecordOpType.Put, shape] })
		expect(room.getRecord(shape.id)).toBeDefined()
		expect(pushResult(socket)).toMatchObject({ action: 'commit' })
	})

	it('refuses the whole push when a shape is reparented into a frame it also deletes', () => {
		const room = makeRoom()
		connect(room, 'b', { userId: 'B', role: 'student' })
		const shape = frame('child', 'page:b')
		push(room, 'b', { [shape.id]: [RecordOpType.Put, shape] })
		expect(room.getRecord(shape.id)).toBeDefined()

		push(room, 'b', {
			'shape:frame-on-b': [RecordOpType.Remove],
			[shape.id]: [RecordOpType.Patch, { parentId: ['put', 'shape:frame-on-b'] }],
		})
		expect(room.getRecord('shape:frame-on-b')).toBeDefined()
		expect((room.getRecord(shape.id) as any).parentId).toEqual('page:b')
	})

	it('deletes a frame and its children in one push, frame first', () => {
		const room = makeRoom()
		connect(room, 'b', { userId: 'B', role: 'student' })
		const child = frame('child', 'shape:frame-on-b')
		push(room, 'b', { [child.id]: [RecordOpType.Put, child] })
		expect(room.getRecord(child.id)).toBeDefined()

		push(room, 'b', {
			'shape:frame-on-b': [RecordOpType.Remove],
			[child.id]: [RecordOpType.Remove],
		})
		expect(room.getRecord('shape:frame-on-b')).toBeUndefined()
		expect(room.getRecord(child.id)).toBeUndefined()
	})
})

describe('the structure rule through TLSocketRoom', () => {
	const authorize: TLSyncRule<TLRecord, Meta> = composeRules(createStructureRule(), classroomRule)
	const teacher = { userId: 'T', role: 'teacher' } as const

	it('lets a valid push through to the next rule', () => {
		const room = makeRoom(authorize)
		const socket = connect(room, 't', teacher)
		const shape = frame('inside', 'shape:frame-on-b')
		push(room, 't', { [shape.id]: [RecordOpType.Put, shape] })
		expect(room.getRecord(shape.id)).toBeDefined()
		expect(pushResult(socket)).toMatchObject({ action: 'commit' })
	})

	it('runs before the next rule, so a teacher still cannot leave a shape without a parent', () => {
		const room = makeRoom(authorize)
		const socket = connect(room, 't', teacher)
		const lost = frame('lost', 'shape:gone')
		push(room, 't', { [lost.id]: [RecordOpType.Put, lost] })
		expect(room.getRecord(lost.id)).toBeUndefined()
		expect(pushResult(socket)).toMatchObject({
			action: 'discard',
			refused: { reason: 'dangling parent', ids: [lost.id] },
		})
	})
})

describe('permissions from the server', () => {
	// The server decides each session's permissions; the rule only reads them.
	const permissionRule = perRecord<TLRecord, Meta>((change, { session }) => {
		const missing = getMissingPermission(session.permissions, change)
		return missing ? `Needs ${missing}` : null
	})
	function makePermissionRoom() {
		const storage = new InMemorySyncStorage<TLRecord>({
			snapshot: {
				clock: 0,
				documentClock: 0,
				schema: schema.serialize(),
				documents: [page('page:a', 'A')].map((state) => ({ state, lastChangedClock: 0 })),
			},
		})
		return new TLSocketRoom<TLRecord, Meta>({
			schema,
			storage,
			authorize: composeRules(createStructureRule(), permissionRule),
		})
	}
	const student = { userId: 'B', role: 'student' } as const

	it('lets a student draw once the server grants it, without a reconnect', () => {
		const room = makePermissionRoom()
		const socket = connect(room, 'b', student, schema, ['tl:page:update'])
		const before = frame('before-grant', 'page:a')
		push(room, 'b', { [before.id]: [RecordOpType.Put, before] })
		expect(room.getRecord(before.id)).toBeUndefined()
		expect(pushResult(socket)).toMatchObject({ refused: { reason: 'Needs tl:shape:create' } })

		room.updateSessionPermissions('b', ['tl:shape:*'])
		const sent = socket.send.mock.calls.map((c) => JSON.parse(c[0]))
		expect(sent).toContainEqual({
			type: 'custom',
			data: { type: 'tl:permissions', permissions: ['tl:shape:*'] },
		})

		const after = frame('after-grant', 'page:a')
		push(room, 'b', { [after.id]: [RecordOpType.Put, after] })
		expect(room.getRecord(after.id)).toBeDefined()
	})
})
