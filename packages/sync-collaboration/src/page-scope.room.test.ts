import {
	getTlsyncProtocolVersion,
	InMemorySyncStorage,
	RecordOpType,
	TLSocketRoom,
	TLSyncAuthorizer,
} from '@tldraw/sync-core'
import { createShapeId, createTLSchema, PageRecordType, TLPageId, TLRecord } from '@tldraw/tlschema'
import { describe, expect, it, vi } from 'vitest'
import { getOwningPage } from './page-scope'

interface Meta {
	userId: string
	role: 'teacher' | 'student'
}

const schema = createTLSchema()

const classroomRule: TLSyncAuthorizer<TLRecord, Meta> = ({ session, get, record, prev, next }) => {
	if (session.meta.role === 'teacher') return record
	for (const end of [prev, next]) {
		if (!end) continue
		const owning = getOwningPage(get, end)
		if (!owning.page) return null
		if ((owning.page.meta as { ownerId?: string }).ownerId !== session.meta.userId) return null
	}
	if (record.typeName === 'page' && prev && next && prev.meta.ownerId !== next.meta.ownerId)
		return null
	return record
}

function makeSocket() {
	return {
		send: vi.fn(),
		close: vi.fn(),
		readyState: WebSocket.OPEN,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	}
}

function connect(room: TLSocketRoom<TLRecord, Meta>, sessionId: string, meta: Meta) {
	const socket = makeSocket()
	room.handleSocketConnect({ sessionId, socket, meta })
	room.handleSocketMessage(
		sessionId,
		JSON.stringify({
			type: 'connect',
			connectRequestId: 'connect-' + sessionId,
			lastServerClock: 0,
			protocolVersion: getTlsyncProtocolVersion(),
			schema: schema.serialize(),
		})
	)
	socket.send.mockClear()
	return socket
}

function push(room: TLSocketRoom<TLRecord, Meta>, sessionId: string, diff: Record<string, any>) {
	room.handleSocketMessage(sessionId, JSON.stringify({ type: 'push', clientClock: 1, diff }))
}

function pushResultAction(socket: ReturnType<typeof makeSocket>) {
	return socket.send.mock.calls
		.map((c) => JSON.parse(c[0]))
		.flatMap((m) => (m.type === 'data' ? m.data : [m]))
		.find((m) => m.type === 'push_result')?.action
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

function makeRoom() {
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
	return new TLSocketRoom<TLRecord, Meta>({ schema, storage, authorize: classroomRule })
}

describe('a page-scoped rule through TLSocketRoom', () => {
	it('lets a student draw inside a frame on their own page', () => {
		const room = makeRoom()
		const socket = connect(room, 'b', { userId: 'B', role: 'student' })
		const shape = frame('inside', 'shape:frame-on-b')
		push(room, 'b', { [shape.id]: [RecordOpType.Put, shape] })
		expect(room.getRecord(shape.id)).toBeDefined()
		expect(pushResultAction(socket)).toEqual('commit')
	})

	it('refuses a student drawing inside a frame on another student page', () => {
		const room = makeRoom()
		const socket = connect(room, 'a', { userId: 'A', role: 'student' })
		const shape = frame('intruder', 'shape:frame-on-b')
		push(room, 'a', { [shape.id]: [RecordOpType.Put, shape] })
		expect(room.getRecord(shape.id)).toBeUndefined()
		expect(pushResultAction(socket)).toEqual('discard')
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
		expect(pushResultAction(socket)).toEqual('commit')
	})

	it('refuses a shape reparented into a frame deleted earlier in the same push', () => {
		const room = makeRoom()
		connect(room, 'b', { userId: 'B', role: 'student' })
		const shape = frame('child', 'page:b')
		push(room, 'b', { [shape.id]: [RecordOpType.Put, shape] })
		expect(room.getRecord(shape.id)).toBeDefined()

		push(room, 'b', {
			'shape:frame-on-b': [RecordOpType.Remove],
			[shape.id]: [RecordOpType.Patch, { parentId: ['put', 'shape:frame-on-b'] }],
		})
		expect(room.getRecord('shape:frame-on-b')).toBeUndefined()
		expect((room.getRecord(shape.id) as any).parentId).toEqual('page:b')
	})
})
