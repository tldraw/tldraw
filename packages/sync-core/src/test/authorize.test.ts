import {
	createBindingId,
	createShapeId,
	createUserId,
	InstancePresenceRecordType,
	PageRecordType,
	TLArrowBinding,
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
import {
	perRecord,
	TLRoomSocket,
	TLSyncAuthorizer,
	TLSyncRoom,
	TLSyncTransform,
} from '../lib/TLSyncRoom'

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
	transform?: TLSyncTransform<TLRecord, Meta>
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
		transform: opts.transform,
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

function arrowBinding(
	id: ReturnType<typeof createBindingId>,
	fromId: ReturnType<typeof createShapeId>,
	toId: ReturnType<typeof createShapeId>
): TLArrowBinding {
	return schema.types.binding.create({
		id,
		type: 'arrow',
		fromId,
		toId,
		props: {
			terminal: 'end',
			normalizedAnchor: { x: 0.5, y: 0.5 },
			isExact: false,
			isPrecise: false,
			snap: 'none',
		},
	}) as TLArrowBinding
}

const pageA = PageRecordType.createId('a')
const pageB = PageRecordType.createId('b')
const frameOnB = createShapeId('frame-on-b')

// Walk a shape to its page; a binding lives on the page both its shapes are on. `null` when the
// chain dead-ends or the binding spans pages: a rule must refuse on that. Hosts should use
// `getOwningPage` from `@tldraw/sync-collaboration` instead; it lives here only because that package
// depends on this one.
function pageOf(get: (id: string) => TLRecord | undefined, record: TLRecord): TLRecord | null {
	if (record.typeName === 'binding') {
		const from = get(record.fromId)
		const to = get(record.toId)
		if (!from || !to) return null
		const page = pageOf(get, from)
		return page && page === pageOf(get, to) ? page : null
	}
	let cur: TLRecord | undefined = record
	while (cur && cur.typeName === 'shape' && !cur.parentId.startsWith('page:')) {
		cur = get(cur.parentId)
	}
	if (!cur) return null
	if (cur.typeName === 'page') return cur
	if (cur.typeName !== 'shape') return null
	return get(cur.parentId) ?? null
}

// The teacher may change anything. A student may change only shapes on their own page, and may
// not touch a page's policy. `prev` is judged on the board before the push, `next` after it.
const classroomRule: TLSyncAuthorizer<TLRecord, Meta> = perRecord(
	({ prev, next }, { session, before, after }) => {
		if (session.meta.role === 'teacher') return null
		if (next?.typeName === 'page' && (next.meta as any).ownerId !== (prev?.meta as any)?.ownerId) {
			return 'only teachers assign pages'
		}
		for (const [record, get] of [
			[prev, before],
			[next, after],
		] as const) {
			if (!record) continue
			const page = pageOf(get, record)
			if (!page) return 'dangling parent'
			if ((page.meta as any).ownerId !== session.meta.userId) return 'not your page'
		}
		return null
	}
)

function ids(storage: InMemorySyncStorage<TLRecord>) {
	return storage.getSnapshot().documents.map((d) => d.state.id)
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

		expect(ids(storage)).not.toContain(shapeId)
		expect(lastPushResult(socket)).toMatchObject({
			type: 'push_result',
			action: 'discard',
			refused: { reason: 'not your page', ids: [shapeId] },
		})
	})

	it('allows the same push from the teacher', () => {
		const { room, storage } = makeRoom({
			authorize: classroomRule,
			documents: [page(pageA, 'A'), page(pageB, 'B'), frame(frameOnB, pageB)],
		})
		const socket = connect(room, 'teacher', { userId: 'T', role: 'teacher' })

		const shapeId = createShapeId('teacher-shape')
		push(room, 'teacher', { [shapeId]: [RecordOpType.Put, frame(shapeId, frameOnB)] })

		expect(ids(storage)).toContain(shapeId)
		expect(lastPushResult(socket)).toMatchObject({ type: 'push_result', action: 'commit' })
		expect(lastPushResult(socket)).not.toHaveProperty('refused')
	})

	it('refuses the push, and logs, when the rule throws', () => {
		const log = { warn: vi.fn(), error: vi.fn() }
		const { room, storage } = makeRoom({
			authorize: () => {
				throw new Error('rule exploded')
			},
			documents: [page(pageA, 'A')],
			log,
		})
		const socket = connect(room, 'student-a', { userId: 'A', role: 'student' })

		const shapeId = createShapeId('boom')
		push(room, 'student-a', { [shapeId]: [RecordOpType.Put, frame(shapeId, pageA)] })

		expect(ids(storage)).not.toContain(shapeId)
		expect(log.error).toHaveBeenCalledWith(
			'authorize threw; refusing the push',
			expect.objectContaining({ message: 'rule exploded' })
		)
		expect(lastPushResult(socket)).toMatchObject({
			action: 'discard',
			refused: { reason: 'something went wrong' },
		})
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
		expect(ids(storage)).toContain(shapeId)
	})

	it.each([
		['frame first', ['new-frame', 'inside-new-frame']],
		['child first', ['inside-new-frame', 'new-frame']],
	])('accepts a frame and a shape inside it created in one push, %s', (_, order) => {
		const { room, storage } = makeRoom({ authorize: classroomRule, documents: [page(pageA, 'A')] })
		const socket = connect(room, 'student-a', { userId: 'A', role: 'student' })

		const newFrame = createShapeId('new-frame')
		const inside = createShapeId('inside-new-frame')
		const records = {
			[newFrame]: frame(newFrame, pageA),
			[inside]: frame(inside, newFrame),
		}
		const diff: TLPushRequest<TLRecord>['diff'] = {}
		for (const name of order) {
			const id = createShapeId(name)
			diff[id] = [RecordOpType.Put, records[id]]
		}
		push(room, 'student-a', diff)

		expect(ids(storage)).toEqual(expect.arrayContaining([newFrame, inside]))
		expect(lastPushResult(socket)).toMatchObject({ type: 'push_result', action: 'commit' })
	})

	it('deletes a frame with its children when the frame comes first in the push', () => {
		const myFrame = createShapeId('my-frame')
		const child1 = createShapeId('child-1')
		const child2 = createShapeId('child-2')
		const { room, storage } = makeRoom({
			authorize: classroomRule,
			documents: [
				page(pageA, 'A'),
				frame(myFrame, pageA),
				frame(child1, myFrame),
				frame(child2, myFrame),
			],
		})
		const socket = connect(room, 'student-a', { userId: 'A', role: 'student' })

		// the editor sends the container before its contents
		push(room, 'student-a', {
			[myFrame]: [RecordOpType.Remove],
			[child1]: [RecordOpType.Remove],
			[child2]: [RecordOpType.Remove],
		})

		expect(ids(storage)).toEqual([pageA])
		expect(lastPushResult(socket)).toMatchObject({ type: 'push_result', action: 'commit' })
	})

	it('refuses a reparent into a frame deleted in the same push', () => {
		const myFrame = createShapeId('my-frame')
		const loose = createShapeId('loose')
		const { room, storage } = makeRoom({
			authorize: classroomRule,
			documents: [page(pageA, 'A'), frame(myFrame, pageA), frame(loose, pageA)],
		})
		const socket = connect(room, 'student-a', { userId: 'A', role: 'student' })

		push(room, 'student-a', {
			[myFrame]: [RecordOpType.Remove],
			[loose]: [RecordOpType.Put, frame(loose, myFrame)],
		})

		// nothing of the push lands: the frame is still there and the shape still on the page
		expect(ids(storage)).toEqual(expect.arrayContaining([myFrame, loose]))
		expect(storage.getSnapshot().documents.find((d) => d.state.id === loose)!.state).toMatchObject({
			parentId: pageA,
		})
		expect(lastPushResult(socket)).toMatchObject({
			action: 'discard',
			refused: { reason: 'dangling parent', ids: [loose] },
		})
	})

	it('refuses the whole push when a student forges a page policy alongside a shape', () => {
		const { room, storage } = makeRoom({
			authorize: classroomRule,
			documents: [page(pageA, 'A'), page(pageB, 'B')],
		})
		const socket = connect(room, 'student-a', { userId: 'A', role: 'student' })

		// claim B's page, then draw on it, in one push
		const shapeId = createShapeId('on-b')
		push(room, 'student-a', {
			[pageB]: [RecordOpType.Put, page(pageB, 'A')],
			[shapeId]: [RecordOpType.Put, frame(shapeId, pageB)],
		})

		expect(storage.getSnapshot().documents.find((d) => d.state.id === pageB)!.state).toMatchObject({
			meta: { ownerId: 'B' },
		})
		expect(ids(storage)).not.toContain(shapeId)
		// On its own the shape passes: `after` shows the forged owner. The push dies with the page.
		expect(lastPushResult(socket)).toMatchObject({
			action: 'discard',
			refused: { reason: 'only teachers assign pages', ids: [pageB] },
		})
	})

	it('stamps a created record through transform before the rule sees it', () => {
		const seen: TLRecord[] = []
		const { room, storage } = makeRoom({
			transform: ({ record, session }) =>
				record.typeName === 'shape'
					? { ...record, meta: { ...(record as TLRecord).meta, createdBy: session.meta.userId } }
					: record,
			authorize: ({ changes }) => {
				for (const c of changes) if (c.next) seen.push(c.next)
				return null
			},
			documents: [page(pageA, 'A')],
		})
		connect(room, 'student-a', { userId: 'A', role: 'student' })

		const shapeId = createShapeId('stamped')
		push(room, 'student-a', {
			[shapeId]: [RecordOpType.Put, { ...frame(shapeId, pageA), meta: { createdBy: 'forged' } }],
		})

		const stored = storage.getSnapshot().documents.find((d) => d.state.id === shapeId)!.state
		expect((stored as TLRecord).meta).toEqual({ createdBy: 'A' })
		expect(seen.map((r) => r.meta)).toEqual([{ createdBy: 'A' }])
	})

	it('runs transform without an authorize rule', () => {
		const { room, storage } = makeRoom({
			transform: ({ record, session }) =>
				record.typeName === 'shape'
					? { ...record, meta: { ...(record as TLRecord).meta, createdBy: session.meta.userId } }
					: record,
			documents: [page(pageA, 'A')],
		})
		connect(room, 'student-a', { userId: 'A', role: 'student' })

		const shapeId = createShapeId('stamped-no-rule')
		push(room, 'student-a', { [shapeId]: [RecordOpType.Put, frame(shapeId, pageA)] })

		const stored = storage.getSnapshot().documents.find((d) => d.state.id === shapeId)!.state
		expect((stored as TLRecord).meta).toEqual({ createdBy: 'A' })
	})

	it('does not transform updates', () => {
		const myFrame = createShapeId('my-frame')
		const transform = vi.fn(({ record }) => record)
		const { room } = makeRoom({
			transform,
			authorize: () => null,
			documents: [page(pageA, 'A'), frame(myFrame, pageA)],
		})
		connect(room, 'student-a', { userId: 'A', role: 'student' })

		push(room, 'student-a', { [myFrame]: [RecordOpType.Put, { ...frame(myFrame, pageA), x: 10 }] })

		expect(transform).not.toHaveBeenCalled()
	})

	it('deletes a page with its contents in one push, and refuses the same for another page', () => {
		const shapeOnA = createShapeId('shape-on-a')
		const arrowOnA = createShapeId('arrow-on-a')
		const bindingOnA = createBindingId('binding-on-a')
		const { room, storage } = makeRoom({
			authorize: classroomRule,
			documents: [
				page(pageA, 'A'),
				page(pageB, 'B'),
				frame(shapeOnA, pageA),
				frame(arrowOnA, pageA),
				arrowBinding(bindingOnA, arrowOnA, shapeOnA),
				frame(frameOnB, pageB),
			],
		})
		const socket = connect(room, 'student-a', { userId: 'A', role: 'student' })

		// the editor cascades a page delete client-side: page, shapes and bindings in one push
		push(room, 'student-a', {
			[pageA]: [RecordOpType.Remove],
			[shapeOnA]: [RecordOpType.Remove],
			[arrowOnA]: [RecordOpType.Remove],
			[bindingOnA]: [RecordOpType.Remove],
		})
		expect(ids(storage).sort()).toEqual([pageB, frameOnB].sort())
		expect(lastPushResult(socket)).toMatchObject({ action: 'commit' })

		// a second session: the room debounces data messages per session, so a second push's
		// result would still be queued on the first socket
		const socket2 = connect(room, 'student-a-2', { userId: 'A', role: 'student' })
		push(room, 'student-a-2', {
			[pageB]: [RecordOpType.Remove],
			[frameOnB]: [RecordOpType.Remove],
		})
		expect(ids(storage).sort()).toEqual([pageB, frameOnB].sort())
		expect(lastPushResult(socket2)).toMatchObject({
			action: 'discard',
			refused: { reason: 'not your page', ids: [pageB, frameOnB] },
		})
	})

	it('refuses a binding from a student arrow to a shape on another student page', () => {
		const arrowOnA = createShapeId('arrow-on-a')
		const bindingId = createBindingId('cross-page')
		const { room, storage } = makeRoom({
			authorize: classroomRule,
			documents: [
				page(pageA, 'A'),
				page(pageB, 'B'),
				frame(arrowOnA, pageA),
				frame(frameOnB, pageB),
			],
		})
		const socket = connect(room, 'student-a', { userId: 'A', role: 'student' })

		push(room, 'student-a', {
			[bindingId]: [RecordOpType.Put, arrowBinding(bindingId, arrowOnA, frameOnB)],
		})
		expect(ids(storage)).not.toContain(bindingId)
		expect(lastPushResult(socket)).toMatchObject({
			action: 'discard',
			refused: { reason: 'dangling parent', ids: [bindingId] },
		})
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
})
