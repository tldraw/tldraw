import {
	createShapeId,
	createUserId,
	InstancePresenceRecordType,
	PageRecordType,
	TLFrameShape,
	TLPageId,
	TLRecord,
} from '@tldraw/tlschema'
import { createTLSchema } from 'tldraw'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import { RecordOpType } from '../lib/diff'
import { InMemorySyncStorage } from '../lib/InMemorySyncStorage'
import {
	getTlsyncProtocolVersion,
	TLConnectRequest,
	TLPushRequest,
	TLSocketServerSentEvent,
} from '../lib/protocol'
import { TLRoomSocket, TLSyncAuthorizer, TLSyncRoom } from '../lib/TLSyncRoom'

// The classroom: a teacher and two students on one board, one page per student. A page's policy
// lives on the page record (`meta.ownerId`); the rule walks a shape to its page to authorize it.
interface Meta {
	userId: string
	role: 'teacher' | 'student'
}

const schema = createTLSchema()

type MockSocket = TLRoomSocket<TLRecord> & {
	__messages: TLSocketServerSentEvent<TLRecord>[]
	sendMessage: Mock
	close: Mock
}

function makeSocket(): MockSocket {
	const socket: MockSocket = {
		__messages: [],
		sendMessage: vi.fn((msg: TLSocketServerSentEvent<TLRecord>) => {
			socket.__messages.push(structuredClone(msg))
		}),
		close: vi.fn(() => {
			socket.isOpen = false
		}),
		isOpen: true,
	}
	return socket
}

const disposables: Array<() => void> = []
afterEach(() => {
	for (const dispose of disposables) dispose()
	disposables.length = 0
})

function makeRoom(opts: {
	authorize?: TLSyncAuthorizer<TLRecord, Meta>
	documents?: TLRecord[]
	log?: { warn: Mock; error: Mock }
}) {
	const storage = new InMemorySyncStorage<TLRecord>({
		snapshot: {
			clock: 0,
			documentClock: 0,
			schema: schema.serialize(),
			documents: (opts.documents ?? []).map((state) => ({ state, lastChangedClock: 0 })),
		},
	})
	const room = new TLSyncRoom<TLRecord, Meta>({
		schema,
		storage,
		authorize: opts.authorize,
		log: opts.log,
	})
	disposables.push(() => room.close())
	return { room, storage }
}

function connect(
	room: TLSyncRoom<TLRecord, Meta>,
	sessionId: string,
	meta: Meta,
	opts: { isReadonly?: boolean } = {}
): MockSocket {
	const socket = makeSocket()
	room.handleNewSession({ sessionId, socket, meta, isReadonly: opts.isReadonly ?? false })
	room.handleMessage(sessionId, {
		type: 'connect',
		connectRequestId: 'connect-' + sessionId,
		lastServerClock: 0,
		protocolVersion: getTlsyncProtocolVersion(),
		schema: room.serializedSchema,
	} satisfies TLConnectRequest)
	socket.__messages.length = 0
	return socket
}

function push(
	room: TLSyncRoom<TLRecord, Meta>,
	sessionId: string,
	diff: TLPushRequest<TLRecord>['diff']
) {
	room.handleMessage(sessionId, {
		type: 'push',
		clientClock: 1,
		diff,
	} satisfies TLPushRequest<TLRecord>)
}

function lastPushResult(socket: MockSocket) {
	return socket.__messages
		.flatMap((m: any) => (m.type === 'data' ? m.data : []))
		.filter((m: any) => m.type === 'push_result')
		.at(-1)
}

function page(id: TLPageId, ownerId: string): TLRecord {
	return PageRecordType.create({ id, name: ownerId, index: 'a1' as any, meta: { ownerId } })
}

function frame(
	id: ReturnType<typeof createShapeId>,
	parentId: TLPageId | ReturnType<typeof createShapeId>
): TLFrameShape {
	return schema.types.shape.create({
		id,
		type: 'frame',
		parentId,
		index: 'a1' as any,
		props: { w: 100, h: 100, name: '', color: 'black' },
	}) as TLFrameShape
}

const pageA = PageRecordType.createId('a')
const pageB = PageRecordType.createId('b')
const frameOnB = createShapeId('frame-on-b')

// Walk a shape to its page. `null` when the chain dead-ends: a rule must refuse on that.
// Hosts should use `getOwningPage` from `@tldraw/sync-collaboration` instead; it lives here only
// because that package depends on this one.
function pageOf(get: (id: string) => TLRecord | undefined, record: TLRecord): TLRecord | null {
	let cur: TLRecord | undefined = record
	while (cur && cur.typeName === 'shape' && !cur.parentId.startsWith('page:')) {
		cur = get(cur.parentId)
	}
	if (!cur) return null
	if (cur.typeName === 'page') return cur
	if (cur.typeName !== 'shape') return null
	return get(cur.parentId) ?? null
}

// The teacher may change anything. A student may change only shapes on their own page.
const classroomRule: TLSyncAuthorizer<TLRecord, Meta> = ({ session, get, prev, next }) => {
	if (session.meta.role === 'teacher') return next ?? prev
	for (const record of [prev, next]) {
		if (!record) continue
		const page = pageOf(get, record)
		if (!page) return null
		if ((page.meta as any).ownerId !== session.meta.userId) return null
	}
	return next ?? prev
}

describe('authorize', () => {
	it('refuses a student shape under a frame on another student page, by reading the frame', () => {
		const { room, storage } = makeRoom({
			authorize: classroomRule,
			documents: [page(pageA, 'A'), page(pageB, 'B'), frame(frameOnB, pageB)],
		})
		const socket = connect(room, 'student-a', { userId: 'A', role: 'student' })

		const shapeId = createShapeId('intruder')
		push(room, 'student-a', { [shapeId]: [RecordOpType.Put, frame(shapeId, frameOnB)] })

		expect(storage.getSnapshot().documents.map((d) => d.state.id)).not.toContain(shapeId)
		expect(lastPushResult(socket)).toMatchObject({ type: 'push_result', action: 'discard' })
	})

	it('refuses, and logs, when the rule throws', () => {
		const log = { warn: vi.fn(), error: vi.fn() }
		const { room, storage } = makeRoom({
			authorize: () => {
				throw new Error('rule exploded')
			},
			documents: [page(pageA, 'A')],
			log,
		})
		connect(room, 'student-a', { userId: 'A', role: 'student' })

		const shapeId = createShapeId('boom')
		push(room, 'student-a', { [shapeId]: [RecordOpType.Put, frame(shapeId, pageA)] })

		expect(storage.getSnapshot().documents.map((d) => d.state.id)).not.toContain(shapeId)
		expect(log.error).toHaveBeenCalledWith(
			'authorize threw; rejecting the write',
			expect.objectContaining({ message: 'rule exploded' })
		)
	})

	it('ignores the connect-time readonly flag once a rule is set, but still tells the client', () => {
		const { room, storage } = makeRoom({ authorize: classroomRule, documents: [page(pageA, 'A')] })
		const socket = makeSocket()
		room.handleNewSession({
			sessionId: 'student-a',
			socket,
			meta: { userId: 'A', role: 'student' },
			isReadonly: true,
		})
		room.handleMessage('student-a', {
			type: 'connect',
			connectRequestId: 'connect-student-a',
			lastServerClock: 0,
			protocolVersion: getTlsyncProtocolVersion(),
			schema: room.serializedSchema,
		} satisfies TLConnectRequest)
		// the flag is a UI hint: the client learns it
		expect(socket.__messages.find((m: any) => m.type === 'connect')).toMatchObject({
			isReadonly: true,
		})

		// but the rule decides: a student may write on their own page
		const shapeId = createShapeId('own-page')
		push(room, 'student-a', { [shapeId]: [RecordOpType.Put, frame(shapeId, pageA)] })
		expect(storage.getSnapshot().documents.map((d) => d.state.id)).toContain(shapeId)
	})

	it('lets a rule read a record created earlier in the same push', () => {
		const { room, storage } = makeRoom({ authorize: classroomRule, documents: [page(pageA, 'A')] })
		const socket = connect(room, 'student-a', { userId: 'A', role: 'student' })

		const newFrame = createShapeId('new-frame')
		const inside = createShapeId('inside-new-frame')
		push(room, 'student-a', {
			[newFrame]: [RecordOpType.Put, frame(newFrame, pageA)],
			[inside]: [RecordOpType.Put, frame(inside, newFrame)],
		})

		const ids = storage.getSnapshot().documents.map((d) => d.state.id)
		expect(ids).toContain(newFrame)
		expect(ids).toContain(inside)
		expect(lastPushResult(socket)).toMatchObject({ type: 'push_result', action: 'commit' })
	})

	it('never consults the rule for presence', () => {
		const authorize = vi.fn(() => null)
		const { room } = makeRoom({ authorize, documents: [page(pageA, 'A')] })
		connect(room, 'student-a', { userId: 'A', role: 'student' })

		room.handleMessage('student-a', {
			type: 'push',
			clientClock: 1,
			presence: [
				RecordOpType.Put,
				InstancePresenceRecordType.create({
					id: InstancePresenceRecordType.createId('p'),
					userId: createUserId('A'),
					userName: 'A',
					currentPageId: pageA,
				}) as any,
			],
		})

		expect(authorize).not.toHaveBeenCalled()
		expect([...room.presenceStore.values()]).toHaveLength(1)
	})

	it('allows the same push from the teacher', () => {
		const { room, storage } = makeRoom({
			authorize: classroomRule,
			documents: [page(pageA, 'A'), page(pageB, 'B'), frame(frameOnB, pageB)],
		})
		const socket = connect(room, 'teacher', { userId: 'T', role: 'teacher' })

		const shapeId = createShapeId('teacher-shape')
		push(room, 'teacher', { [shapeId]: [RecordOpType.Put, frame(shapeId, frameOnB)] })

		expect(storage.getSnapshot().documents.map((d) => d.state.id)).toContain(shapeId)
		expect(lastPushResult(socket)).toMatchObject({ type: 'push_result', action: 'commit' })
	})
})
