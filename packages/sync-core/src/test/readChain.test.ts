import {
	BaseRecord,
	PermissionChain,
	PermissionMiddleware,
	RecordId,
	StoreSchema,
	createRecordType,
} from '@tldraw/store'
import { vi, type Mock } from 'vitest'
import { RecordOpType, ValueOpType } from '../lib/diff'
import { InMemorySyncStorage } from '../lib/InMemorySyncStorage'
import { TLSyncActor } from '../lib/permissions'
import {
	TLConnectRequest,
	TLPushRequest,
	TLSocketServerSentEvent,
	getTlsyncProtocolVersion,
} from '../lib/protocol'
import { RoomSnapshot, TLRoomSocket, TLSyncRoom } from '../lib/TLSyncRoom'

// The read-delivery tests of the beforeRead hook PR (#11334), run through a permission chain. Each
// per-type hook map becomes one chain layer (`readHooksLayer`), so the delivery rules (what each
// session holds, removes, full puts after a patch, masked copies) are checked on the batch path.

type ReadHook = (args: { session: TLSyncActor<any>; record: any; get(id: string): any }) => any

function readHooksLayer(
	hooks: Record<string, ReadHook>
): PermissionMiddleware<any, TLSyncActor<any>> {
	return (batch, next) => {
		if (batch.kind !== 'read') return next()
		const passed = []
		for (const access of batch.items) {
			if (access.type !== 'read') continue
			const hook = hooks[access.record.typeName]
			const result = hook
				? hook({ session: batch.actor, record: access.record, get: batch.get })
				: undefined
			if (result === null) continue
			passed.push(result === undefined ? access : { ...access, record: result })
		}
		return next(passed)
	}
}

function canRead(checks: Record<string, (args: any) => unknown>): Record<string, ReadHook> {
	const hooks: Record<string, ReadHook> = {}
	for (const [type, check] of Object.entries(checks)) {
		hooks[type] = (args) => (check(args) === true ? undefined : null)
	}
	return hooks
}

// A generic object-lane test schema: `doc` records live in the document lane, `note` records are
// served through the object-store lane (see `objectTypes` below). Deliberately not comment-shaped —
// the lane is a generic primitive.

interface DocRecord extends BaseRecord<'doc', RecordId<DocRecord>> {
	title: string
}
interface NoteRecord extends BaseRecord<'note', RecordId<NoteRecord>> {
	text: string
}
interface PresenceRecord extends BaseRecord<'presence', RecordId<PresenceRecord>> {
	name: string
}

const Doc = createRecordType<DocRecord>('doc', {
	scope: 'document',
	validator: {
		validate: (value) => {
			if (typeof (value as DocRecord).title !== 'string') throw new Error('title must be a string')
			return value as DocRecord
		},
	},
})
const Note = createRecordType<NoteRecord>('note', {
	scope: 'document',
	validator: { validate: (value) => value as NoteRecord },
})
const Presence = createRecordType<PresenceRecord>('presence', {
	scope: 'presence',
	validator: { validate: (value) => value as PresenceRecord },
})

type R = DocRecord | NoteRecord | PresenceRecord

const schema = StoreSchema.create<R>({ doc: Doc, note: Note, presence: Presence })

type MockSocket = TLRoomSocket<any> & {
	__messages: TLSocketServerSentEvent<any>[]
	sendMessage: Mock
	close: Mock
}

function makeSocket(): MockSocket {
	const socket: MockSocket = {
		__messages: [],
		// cloning because the room reuses/clears message objects after sending
		sendMessage: vi.fn((msg: TLSocketServerSentEvent<any>) => {
			socket.__messages.push(structuredClone(msg))
		}),
		close: vi.fn(() => {
			socket.isOpen = false
		}),
		isOpen: true,
	}
	return socket
}

function sentDataMessages(socket: MockSocket): any[] {
	return socket.__messages.flatMap((msg: any) => (msg.type === 'data' ? msg.data : []))
}

function clearSocket(socket: MockSocket) {
	socket.sendMessage.mockClear()
	socket.__messages.length = 0
}

const disposables: Array<() => void> = []
afterEach(() => {
	for (const dispose of disposables) dispose()
	disposables.length = 0
})

function makeRoom(
	opts: {
		snapshot?: RoomSnapshot
		objectTypes?: readonly string[]
		onCommittedChanges?(args: { diff: any; documentClock: number }): void
		beforeRead?: Record<string, ReadHook>
		log?: any
	} = {}
) {
	const storage = new InMemorySyncStorage<R>({
		snapshot: opts.snapshot ?? {
			documents: [],
			clock: 0,
			documentClock: 0,
			schema: schema.serialize(),
		},
		// keep the storage partition in step with the room's object lane
		objectTypes: opts.objectTypes,
	})
	const room = new TLSyncRoom<R, undefined>({
		schema,
		storage,
		objectTypes: opts.objectTypes,
		onCommittedChanges: opts.onCommittedChanges,
		permissions: opts.beforeRead
			? new PermissionChain<R, TLSyncActor<any>>(readHooksLayer(opts.beforeRead))
			: undefined,
		log: opts.log,
	})
	disposables.push(() => room.close())
	return { storage, room }
}

function connectSession(
	room: TLSyncRoom<any, any>,
	sessionId: string,
	opts: {
		isReadonly?: boolean
		objectAccess?: 'read' | 'write'
		clear?: boolean
		meta?: any
	} = {}
): MockSocket {
	const socket = makeSocket()
	room.handleNewSession({
		sessionId,
		socket,
		meta: opts.meta,
		isReadonly: opts.isReadonly ?? false,
		objectAccess: opts.objectAccess,
	})
	room.handleMessage(sessionId, {
		type: 'connect',
		connectRequestId: 'connect-' + sessionId,
		lastServerClock: 0,
		protocolVersion: getTlsyncProtocolVersion(),
		schema: room.serializedSchema,
	} satisfies TLConnectRequest)
	if (opts.clear !== false) {
		clearSocket(socket)
	}
	return socket
}

function push(
	room: TLSyncRoom<any, any>,
	sessionId: string,
	diff: TLPushRequest<any>['diff'],
	clientClock = 1
) {
	room.handleMessage(sessionId, { type: 'push', clientClock, diff } satisfies TLPushRequest<any>)
}

function lastPushResult(socket: MockSocket) {
	return sentDataMessages(socket)
		.filter((m) => m.type === 'push_result')
		.at(-1)
}

function storedIds(storage: InMemorySyncStorage<R>) {
	// span both partitions: the document snapshot no longer contains object-lane records
	return [...storage.getSnapshot().documents, ...storage.getObjectsSnapshot()]
		.map((d) => d.state.id)
		.sort()
}

describe('beforeRead', () => {
	// alice is the owner and sees everything; bob cannot see secret docs; carol gets titles masked
	const readHooks = {
		doc: ({ session, record }: { session: { meta: any }; record: DocRecord }) => {
			if (session.meta.role === 'owner') return undefined
			if (record.title.startsWith('secret')) return null
			if (session.meta.role === 'masked') return { ...record, title: '***' }
			return undefined
		},
	}

	const plain = Doc.create({ title: 'plain' })
	const secret = Doc.create({ title: 'secret plan' })

	function roomWith(beforeRead: any = readHooks, log?: any) {
		const { room, storage } = makeRoom({
			beforeRead,
			log,
			snapshot: {
				documents: [
					{ state: plain, lastChangedClock: 0 },
					{ state: secret, lastChangedClock: 0 },
				],
				clock: 0,
				documentClock: 0,
				schema: schema.serialize(),
			},
		})
		return { room, storage }
	}

	const connectDiff = (socket: MockSocket) =>
		(socket.__messages.find((m: any) => m.type === 'connect') as any).diff
	// later data messages wait for a debounce timer, so flush them first
	const patches = (room: TLSyncRoom<any, any>, sessionId: string, socket: MockSocket) => {
		room._flushDataMessages(sessionId)
		return sentDataMessages(socket)
			.filter((m) => m.type === 'patch')
			.map((m) => m.diff)
	}

	describe('on connect', () => {
		it('sends each session what its hooks allow', () => {
			const { room } = roomWith()
			const alice = connectSession(room, 'alice', { meta: { role: 'owner' }, clear: false })
			const bob = connectSession(room, 'bob', { meta: { role: 'viewer' }, clear: false })
			const carol = connectSession(room, 'carol', { meta: { role: 'masked' }, clear: false })

			expect(connectDiff(alice)).toEqual({
				[plain.id]: [RecordOpType.Put, plain],
				[secret.id]: [RecordOpType.Put, secret],
			})
			expect(connectDiff(bob)).toEqual({ [plain.id]: [RecordOpType.Put, plain] })
			expect(connectDiff(carol)).toEqual({
				[plain.id]: [RecordOpType.Put, { ...plain, title: '***' }],
			})
		})

		it('always sends a full view, even to a client that reconnects', () => {
			const { room, storage } = roomWith()
			const socket = makeSocket()
			room.handleNewSession({
				sessionId: 'bob',
				socket,
				meta: { role: 'viewer' } as any,
				isReadonly: false,
			})
			room.handleMessage('bob', {
				type: 'connect',
				connectRequestId: 'c',
				lastServerClock: storage.getClock(),
				protocolVersion: getTlsyncProtocolVersion(),
				schema: room.serializedSchema,
			} satisfies TLConnectRequest)

			const connect = socket.__messages.find((m: any) => m.type === 'connect') as any
			expect(connect.hydrationType).toBe('wipe_all')
			expect(connect.diff).toEqual({ [plain.id]: [RecordOpType.Put, plain] })
		})
	})

	describe('on broadcast', () => {
		it('keeps patches for a client that holds the stored record', () => {
			const { room } = roomWith()
			connectSession(room, 'alice', { meta: { role: 'owner' } })
			const bob = connectSession(room, 'bob', { meta: { role: 'viewer' } })

			push(room, 'alice', {
				[plain.id]: [RecordOpType.Patch, { title: [ValueOpType.Put, 'other'] }],
			})

			expect(patches(room, 'bob', bob)).toEqual([
				{ [plain.id]: [RecordOpType.Patch, { title: [ValueOpType.Put, 'other'] }] },
			])
		})

		it('sends nothing for a hidden record, a whole record when it shows, and one remove when it hides', () => {
			const { room } = roomWith()
			connectSession(room, 'alice', { meta: { role: 'owner' } })
			const bob = connectSession(room, 'bob', { meta: { role: 'viewer' } })
			const title = (t: string) =>
				({ [secret.id]: [RecordOpType.Patch, { title: [ValueOpType.Put, t] }] }) as any

			push(room, 'alice', title('secret v2'), 1)
			expect(patches(room, 'bob', bob)).toEqual([])

			push(room, 'alice', title('public'), 2)
			push(room, 'alice', title('secret again'), 3)
			push(room, 'alice', title('secret v4'), 4)
			push(room, 'alice', { [secret.id]: [RecordOpType.Remove] }, 5)

			expect(patches(room, 'bob', bob)).toEqual([
				{ [secret.id]: [RecordOpType.Put, { ...secret, title: 'public' }] },
				{ [secret.id]: [RecordOpType.Remove] },
			])
		})

		it('sends a changed copy only when it differs from the one the client holds', () => {
			// keeps the first letter, so some title changes change the copy and some do not
			const { room } = roomWith({
				doc: ({ record }: { record: DocRecord }) => ({ ...record, title: record.title[0] + '***' }),
			})
			connectSession(room, 'alice', { meta: { role: 'owner' } })
			const carol = connectSession(room, 'carol', { meta: { role: 'masked' } })
			const title = (t: string) =>
				({ [plain.id]: [RecordOpType.Patch, { title: [ValueOpType.Put, t] }] }) as any

			push(room, 'alice', title('other'), 1)
			push(room, 'alice', title('oops'), 2)
			push(room, 'alice', title('xyz'), 3)

			expect(patches(room, 'carol', carol)).toEqual([
				{ [plain.id]: [RecordOpType.Put, { ...plain, title: 'o***' }] },
				{ [plain.id]: [RecordOpType.Put, { ...plain, title: 'x***' }] },
			])
		})

		it('sends nothing, not even a remove, for a new record the client may not see', () => {
			const { room } = roomWith()
			connectSession(room, 'alice', { meta: { role: 'owner' } })
			const bob = connectSession(room, 'bob', { meta: { role: 'viewer' } })
			const created = Doc.create({ title: 'secret new' })

			push(room, 'alice', { [created.id]: [RecordOpType.Put, created] }, 1)
			push(room, 'alice', { [created.id]: [RecordOpType.Remove] }, 2)

			expect(patches(room, 'bob', bob)).toEqual([])
		})

		it('sends server writes through the hooks too', async () => {
			const { room, storage } = roomWith()
			const bob = connectSession(room, 'bob', { meta: { role: 'viewer' } })
			const hidden = Doc.create({ title: 'secret new' })
			const shown = Doc.create({ title: 'plain new' })

			storage.transaction((txn) => {
				txn.set(hidden.id, hidden)
				txn.set(shown.id, shown)
			})
			// the room hears about storage writes on a microtask
			await new Promise((r) => setTimeout(r, 0))

			expect(patches(room, 'bob', bob)).toEqual([{ [shown.id]: [RecordOpType.Put, shown] }])
		})

		it('leaves types without a hook on the shared path', () => {
			const { room } = roomWith({})
			connectSession(room, 'alice', { meta: { role: 'owner' } })
			const bob = connectSession(room, 'bob', { meta: { role: 'viewer' } })

			push(room, 'alice', { [secret.id]: [RecordOpType.Patch, { title: [ValueOpType.Put, 'x'] }] })

			expect(patches(room, 'bob', bob)).toEqual([
				{ [secret.id]: [RecordOpType.Patch, { title: [ValueOpType.Put, 'x'] }] },
			])
		})

		it('sends whole records to a resumed session, which may hold anything', () => {
			const { room } = roomWith()
			connectSession(room, 'alice', { meta: { role: 'owner' } })
			const bob = makeSocket()
			room.handleResumedSession({
				sessionId: 'bob',
				socket: bob,
				meta: { role: 'viewer' } as any,
				isReadonly: false,
				serializedSchema: room.serializedSchema,
				presenceId: null,
				presenceRecord: null,
				requiresLegacyRejection: false,
				supportsStringAppend: true,
			})

			push(
				room,
				'alice',
				{ [plain.id]: [RecordOpType.Patch, { title: [ValueOpType.Put, 'other'] }] },
				1
			)
			push(
				room,
				'alice',
				{ [secret.id]: [RecordOpType.Patch, { title: [ValueOpType.Put, 'secret 2'] }] },
				2
			)

			expect(patches(room, 'bob', bob)).toEqual([
				{ [plain.id]: [RecordOpType.Put, { ...plain, title: 'other' }] },
				{ [secret.id]: [RecordOpType.Remove] },
			])
		})
	})

	describe('push results', () => {
		it('discards a create that the pushing client may not see', () => {
			const { room, storage } = roomWith()
			const bob = connectSession(room, 'bob', { meta: { role: 'viewer' } })
			const created = Doc.create({ title: 'secret mine' })

			push(room, 'bob', { [created.id]: [RecordOpType.Put, created] })

			expect(storedIds(storage)).toContain(created.id)
			// a discard undoes the create on the client, so it needs no remove
			expect(lastPushResult(bob)).toMatchObject({ action: 'discard' })
		})

		it('discards an edit that does not change the copy the pushing client holds', () => {
			const { room, storage } = roomWith()
			const carol = connectSession(room, 'carol', { meta: { role: 'masked' } })

			push(room, 'carol', {
				[plain.id]: [RecordOpType.Patch, { title: [ValueOpType.Put, 'mine'] }],
			})

			expect(storage.getSnapshot().documents.find((d) => d.state.id === plain.id)?.state).toEqual({
				...plain,
				title: 'mine',
			})
			// a discard puts the client back on the copy it holds
			expect(lastPushResult(carol)).toMatchObject({ action: 'discard' })
		})

		it('corrects the pushing client to a changed copy that differs from the one it holds', () => {
			const { room } = roomWith({
				doc: ({ record }: { record: DocRecord }) => ({ ...record, title: record.title[0] + '***' }),
			})
			const carol = connectSession(room, 'carol', { meta: { role: 'masked' } })

			push(room, 'carol', {
				[plain.id]: [RecordOpType.Patch, { title: [ValueOpType.Put, 'zebra'] }],
			})

			expect(lastPushResult(carol)).toMatchObject({
				action: { rebaseWithDiff: { [plain.id]: [RecordOpType.Put, { ...plain, title: 'z***' }] } },
			})
		})

		it('commits a push that the client sees as stored', () => {
			const { room } = roomWith()
			const bob = connectSession(room, 'bob', { meta: { role: 'viewer' } })

			push(room, 'bob', { [plain.id]: [RecordOpType.Patch, { title: [ValueOpType.Put, 'other'] }] })

			expect(lastPushResult(bob)).toMatchObject({ action: 'commit' })
		})
	})

	describe('hook results', () => {
		it.each([
			[
				'throws',
				() => {
					throw new Error('boom')
				},
			],
			['changes the id', ({ record }: any) => ({ ...record, id: 'doc:other' })],
			['changes the typeName', ({ record }: any) => ({ ...record, typeName: 'note' })],
			['returns an invalid copy', ({ record }: any) => ({ ...record, title: 42 })],
		])('sends nothing when the hook %s', (_, hook) => {
			const log = { error: vi.fn(), warn: vi.fn() }
			const { room } = roomWith({ doc: hook }, log)
			const bob = connectSession(room, 'bob', { meta: { role: 'viewer' }, clear: false })

			expect(connectDiff(bob)).toEqual({})
			expect(log.error).toHaveBeenCalled()
		})
	})
})

describe('canRead', () => {
	const plain = Doc.create({ title: 'plain' })
	const secret = Doc.create({ title: 'secret plan' })
	const notSecret = canRead({
		doc: ({ session, record }) =>
			session.meta.role === 'owner' || !record.title.startsWith('secret'),
	})

	function roomWith(beforeRead: any, log?: any) {
		const { room } = makeRoom({
			beforeRead,
			log,
			snapshot: {
				documents: [
					{ state: plain, lastChangedClock: 0 },
					{ state: secret, lastChangedClock: 0 },
				],
				clock: 0,
				documentClock: 0,
				schema: schema.serialize(),
			},
		})
		return room
	}
	const connectDiff = (socket: MockSocket) =>
		(socket.__messages.find((m: any) => m.type === 'connect') as any).diff

	it('sends the stored record when a check returns true, and nothing when it returns false', () => {
		const room = roomWith(notSecret)
		const alice = connectSession(room, 'alice', { meta: { role: 'owner' }, clear: false })
		const bob = connectSession(room, 'bob', { meta: { role: 'viewer' }, clear: false })

		expect(connectDiff(alice)).toEqual({
			[plain.id]: [RecordOpType.Put, plain],
			[secret.id]: [RecordOpType.Put, secret],
		})
		expect(connectDiff(bob)).toEqual({ [plain.id]: [RecordOpType.Put, plain] })
	})

	it('removes a record from a client that holds it when the check turns false', () => {
		const room = roomWith(notSecret)
		connectSession(room, 'alice', { meta: { role: 'owner' } })
		const bob = connectSession(room, 'bob', { meta: { role: 'viewer' } })

		push(room, 'alice', {
			[plain.id]: [RecordOpType.Patch, { title: [ValueOpType.Put, 'secret now'] }],
		})
		room._flushDataMessages('bob')

		expect(
			sentDataMessages(bob)
				.filter((m) => m.type === 'patch')
				.map((m) => m.diff)
		).toEqual([{ [plain.id]: [RecordOpType.Remove] }])
	})

	it('sends nothing while a record is hidden, then the whole record when the check turns true', () => {
		const room = roomWith(notSecret)
		connectSession(room, 'alice', { meta: { role: 'owner' } })
		const bob = connectSession(room, 'bob', { meta: { role: 'viewer' } })
		const title = (t: string) =>
			({ [secret.id]: [RecordOpType.Patch, { title: [ValueOpType.Put, t] }] }) as any

		push(room, 'alice', title('secret v2'), 1)
		push(room, 'alice', title('public'), 2)
		room._flushDataMessages('bob')

		expect(
			sentDataMessages(bob)
				.filter((m) => m.type === 'patch')
				.map((m) => m.diff)
		).toEqual([{ [secret.id]: [RecordOpType.Put, { ...secret, title: 'public' }] }])
	})

	it('hides the record when a check returns a truthy value that is not true', () => {
		const room = roomWith(canRead({ doc: () => 'yes' as any }))
		const bob = connectSession(room, 'bob', { meta: { role: 'viewer' }, clear: false })

		expect(connectDiff(bob)).toEqual({})
	})

	it('hides the record when an async check returns a Promise', () => {
		const room = roomWith(canRead({ doc: (async () => true) as any }))
		const bob = connectSession(room, 'bob', { meta: { role: 'viewer' }, clear: false })

		expect(connectDiff(bob)).toEqual({})
	})

	it('hides the record when a check throws', () => {
		const log = { error: vi.fn() }
		const room = roomWith(
			canRead({
				doc: () => {
					throw new Error('boom')
				},
			}),
			log
		)
		const bob = connectSession(room, 'bob', { meta: { role: 'viewer' }, clear: false })

		expect(connectDiff(bob)).toEqual({})
		expect(log.error).toHaveBeenCalled()
	})
})
