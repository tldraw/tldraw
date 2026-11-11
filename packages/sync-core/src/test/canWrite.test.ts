import { computed } from '@tldraw/state'
import { BaseRecord, RecordId, Store, StoreSchema, createRecordType } from '@tldraw/store'
import { rejectAll, type TLRejectedWrite } from '@tldraw/tlschema'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import { RecordOpType, ValueOpType } from '../lib/diff'
import { InMemorySyncStorage } from '../lib/InMemorySyncStorage'
import {
	TLConnectRequest,
	TLPushRequest,
	TLSocketServerSentEvent,
	getTlsyncProtocolVersion,
} from '../lib/protocol'
import { TLSyncClient } from '../lib/TLSyncClient'
import { TLRoomCanWrite, TLRoomSocket, TLSyncRoom } from '../lib/TLSyncRoom'
import { TestServer } from './TestServer'
import { TestSocketPair } from './TestSocketPair'

interface DocRecord extends BaseRecord<'doc', RecordId<DocRecord>> {
	title: string
	ownerId: string
}
interface PresenceRecord extends BaseRecord<'presence', RecordId<PresenceRecord>> {
	name: string
}

const Doc = createRecordType<DocRecord>('doc', {
	scope: 'document',
	validator: { validate: (value) => value as DocRecord },
})
const Presence = createRecordType<PresenceRecord>('presence', {
	scope: 'presence',
	validator: { validate: (value) => value as PresenceRecord },
})

type R = DocRecord | PresenceRecord
interface Meta {
	userId: string
}

const schema = StoreSchema.create<R>({ doc: Doc, presence: Presence })

type MockSocket = TLRoomSocket<any> & {
	__messages: TLSocketServerSentEvent<any>[]
	sendMessage: Mock
}

function makeSocket(): MockSocket {
	const socket: MockSocket = {
		__messages: [],
		// cloning because the room reuses/clears message objects after sending
		sendMessage: vi.fn((msg: TLSocketServerSentEvent<any>) => {
			socket.__messages.push(structuredClone(msg))
		}),
		close: vi.fn(),
		isOpen: true,
	}
	return socket
}

const disposables: Array<() => void> = []
afterEach(() => {
	while (disposables.length) disposables.pop()!()
})

function makeRoom(canWrite: TLRoomCanWrite<R, Meta> | undefined, documents: DocRecord[] = []) {
	const storage = new InMemorySyncStorage<R>({
		snapshot: {
			documents: documents.map((state) => ({ state, lastChangedClock: 0 })),
			clock: 0,
			documentClock: 0,
			schema: schema.serialize(),
		},
	})
	const log = { warn: vi.fn(), error: vi.fn() }
	const room = new TLSyncRoom<R, Meta>({ schema, storage, canWrite, log })
	disposables.push(() => room.close())
	return { room, storage, log }
}

function connect(room: TLSyncRoom<R, Meta>, sessionId: string, userId = sessionId) {
	const socket = makeSocket()
	room.handleNewSession({ sessionId, socket, meta: { userId }, isReadonly: false })
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

function push(room: TLSyncRoom<R, Meta>, sessionId: string, diff: TLPushRequest<R>['diff']) {
	room.handleMessage(sessionId, { type: 'push', clientClock: 1, diff } satisfies TLPushRequest<R>)
}

function dataMessages(socket: MockSocket): any[] {
	return socket.__messages.flatMap((msg: any) => (msg.type === 'data' ? msg.data : []))
}

function pushResult(socket: MockSocket) {
	return dataMessages(socket)
		.filter((m) => m.type === 'push_result')
		.at(-1)
}

function stored(storage: InMemorySyncStorage<R>) {
	return storage
		.getSnapshot()
		.documents.map((d) => d.state as DocRecord)
		.sort((a, b) => a.id.localeCompare(b.id))
}

const ownRecordsOnly: TLRoomCanWrite<R, Meta> = (changes, { session }) =>
	changes
		.filter((change) => (change.prev ?? change.next)!.typeName === 'doc')
		.filter((change) => ((change.prev ?? change.next) as DocRecord).ownerId !== session.meta.userId)
		.map(({ id }) => ({ id, reason: 'not-yours' }))

describe('canWrite in the room', () => {
	it('stores a push when it returns an empty list', () => {
		const canWrite = vi.fn<TLRoomCanWrite<R, Meta>>(() => [])
		const { room, storage } = makeRoom(canWrite)
		const alice = connect(room, 'alice')

		const doc = Doc.create({ title: 'a', ownerId: 'alice' })
		push(room, 'alice', { [doc.id]: [RecordOpType.Put, doc] })

		expect(pushResult(alice)).toEqual({
			type: 'push_result',
			clientClock: 1,
			serverClock: expect.any(Number),
			action: 'commit',
		})
		expect(stored(storage)).toEqual([doc])
		expect(canWrite).toHaveBeenCalledTimes(1)
	})

	it('gives the batch as changes, with the session and the document before and after', () => {
		const kept = Doc.create({ title: 'kept', ownerId: 'alice' })
		const edited = Doc.create({ title: 'old', ownerId: 'alice' })
		const removed = Doc.create({ title: 'gone', ownerId: 'alice' })
		const created = Doc.create({ title: 'new', ownerId: 'alice' })

		let seen: any
		const { room } = makeRoom(
			(changes, { session, before, after }) => {
				seen = {
					changes,
					session,
					before: [edited, removed, created, kept].map((d) => before.get(d.id)),
					after: [edited, removed, created, kept].map((d) => after.get(d.id)),
				}
				return []
			},
			[kept, edited, removed]
		)
		connect(room, 'alice')

		push(room, 'alice', {
			[edited.id]: [RecordOpType.Patch, { title: [ValueOpType.Put, 'renamed'] }],
			[removed.id]: [RecordOpType.Remove],
			[created.id]: [RecordOpType.Put, created],
		})

		const renamed = { ...edited, title: 'renamed' }
		expect(seen.session).toEqual({ sessionId: 'alice', meta: { userId: 'alice' } })
		expect(seen.changes).toEqual([
			{ id: edited.id, typeName: 'doc', type: 'update', prev: edited, next: renamed },
			{ id: removed.id, typeName: 'doc', type: 'delete', prev: removed, next: null },
			{ id: created.id, typeName: 'doc', type: 'create', prev: null, next: created },
		])
		expect(seen.before).toEqual([edited, removed, undefined, kept])
		expect(seen.after).toEqual([renamed, undefined, created, kept])
	})

	it('discards the whole push on one rejection, and reports each change', () => {
		const theirs = Doc.create({ title: 'theirs', ownerId: 'bob' })
		const { room, storage } = makeRoom(ownRecordsOnly, [theirs])
		const alice = connect(room, 'alice')
		const bob = connect(room, 'bob')

		const mine = Doc.create({ title: 'mine', ownerId: 'alice' })
		push(room, 'alice', {
			[mine.id]: [RecordOpType.Put, mine],
			[theirs.id]: [RecordOpType.Patch, { title: [ValueOpType.Put, 'taken'] }],
		})

		expect(pushResult(alice)).toMatchObject({
			action: 'discard',
			rejections: [
				{ id: mine.id, reason: 'not-yours' },
				{ id: theirs.id, reason: 'not-yours' },
			],
		})
		expect(stored(storage)).toEqual([theirs])

		room._flushDataMessages('bob')
		expect(dataMessages(bob)).toEqual([])
	})

	it('keeps the reason of each rejection that the function names', () => {
		const a = Doc.create({ title: 'a', ownerId: 'alice' })
		const b = Doc.create({ title: 'b', ownerId: 'alice' })
		const c = Doc.create({ title: 'c', ownerId: 'alice' })
		const { room } = makeRoom(() => [
			{ id: b.id, reason: 'locked' },
			{ id: a.id, reason: 'too-many' },
		])
		const alice = connect(room, 'alice')

		push(room, 'alice', {
			[a.id]: [RecordOpType.Put, a],
			[b.id]: [RecordOpType.Put, b],
			[c.id]: [RecordOpType.Put, c],
		})

		expect(pushResult(alice).rejections).toEqual([
			{ id: a.id, reason: 'too-many' },
			{ id: b.id, reason: 'locked' },
			// not named: discarded with the push, so it gets the first reason
			{ id: c.id, reason: 'locked' },
		])
	})

	it('can judge from the document after the push', () => {
		const turn = Doc.create({ title: 'bob', ownerId: 'teacher' })
		const note = Doc.create({ title: 'note', ownerId: 'alice' })
		const myTurnOnly: TLRoomCanWrite<R, Meta> = (changes, { session, after }) =>
			(after.get(turn.id) as DocRecord).title === session.meta.userId
				? []
				: rejectAll(changes, 'not-your-turn')
		const { room, storage } = makeRoom(myTurnOnly, [turn, note])
		const alice = connect(room, 'alice')

		push(room, 'alice', { [note.id]: [RecordOpType.Patch, { title: [ValueOpType.Put, 'x'] }] })

		expect(pushResult(alice).rejections).toEqual([{ id: note.id, reason: 'not-your-turn' }])
		expect(stored(storage)).toEqual([turn, note].sort((a, b) => a.id.localeCompare(b.id)))
	})

	it.each([
		[
			'throws',
			() => {
				throw new Error('boom')
			},
		],
		['returns nothing', () => undefined],
		['returns true', () => true],
		['names an id that is not in the push', () => [{ id: 'doc:other', reason: 'x' }]],
		['returns a rejection with no reason', (changes: readonly any[]) => [{ id: changes[0].id }]],
	] as [string, (changes: readonly any[]) => any][])(
		'rejects the push when the function %s',
		(_name, canWrite) => {
			const { room, storage, log } = makeRoom(canWrite)
			const alice = connect(room, 'alice')

			const doc = Doc.create({ title: 'a', ownerId: 'alice' })
			push(room, 'alice', { [doc.id]: [RecordOpType.Put, doc] })

			expect(pushResult(alice)).toMatchObject({
				action: 'discard',
				rejections: [{ id: doc.id, reason: 'not-allowed' }],
			})
			expect(stored(storage)).toEqual([])
			expect(log.error).toHaveBeenCalledTimes(1)
		}
	)

	it('does not judge presence, and applies it from a rejected push', () => {
		const canWrite = vi.fn<TLRoomCanWrite<R, Meta>>((changes) => rejectAll(changes, 'no'))
		const { room } = makeRoom(canWrite)
		connect(room, 'alice')
		const bob = connect(room, 'bob')

		const doc = Doc.create({ title: 'a', ownerId: 'alice' })
		room.handleMessage('alice', {
			type: 'push',
			clientClock: 1,
			diff: { [doc.id]: [RecordOpType.Put, doc] },
			presence: [RecordOpType.Put, { id: 'presence:x', typeName: 'presence', name: 'alice' }],
		} as TLPushRequest<R>)

		expect(canWrite.mock.calls[0][0].map((change) => change.typeName)).toEqual(['doc'])
		room._flushDataMessages('bob')
		const patch = dataMessages(bob).find((m) => m.type === 'patch')
		expect(Object.values(patch.diff)).toEqual([
			[RecordOpType.Put, expect.objectContaining({ typeName: 'presence', name: 'alice' })],
		])
	})

	it('does not run when the push changes no document record', () => {
		const doc = Doc.create({ title: 'a', ownerId: 'alice' })
		const canWrite = vi.fn<TLRoomCanWrite<R, Meta>>(() => [])
		const { room } = makeRoom(canWrite, [doc])
		const alice = connect(room, 'alice')

		push(room, 'alice', { [doc.id]: [RecordOpType.Put, doc] })

		expect(canWrite).not.toHaveBeenCalled()
		expect(pushResult(alice).rejections).toBeUndefined()
	})

	it('sends no rejections field without the option', () => {
		const { room, storage } = makeRoom(undefined)
		const alice = connect(room, 'alice')

		const doc = Doc.create({ title: 'a', ownerId: 'bob' })
		push(room, 'alice', { [doc.id]: [RecordOpType.Put, doc] })

		expect(pushResult(alice)).toEqual({
			type: 'push_result',
			clientClock: 1,
			serverClock: expect.any(Number),
			action: 'commit',
		})
		expect(stored(storage)).toEqual([doc])
	})
})

describe('a rejection in the sync client', () => {
	function makeClient(canWrite: TLRoomCanWrite<R, undefined>) {
		const seeded = Doc.create({ title: 'server', ownerId: 'bob' })
		const server = new TestServer<R>(
			schema,
			{
				documents: [{ state: seeded, lastChangedClock: 0 }],
				clock: 0,
				documentClock: 0,
				schema: schema.serialize(),
			},
			{ canWrite }
		)
		const socketPair = new TestSocketPair<R>('client', server)
		socketPair.connect()

		const rejected: TLRejectedWrite<R>[] = []
		const store = new Store<R>({ schema, props: {} })
		const client = new TLSyncClient<R>({
			store,
			socket: socketPair.clientSocket,
			presence: computed('presence', () => null),
			onLoad: () => {},
			onSyncError: (reason) => {
				throw new Error(`unexpected sync error: ${reason}`)
			},
			onWriteRejected: (r) => rejected.push(r),
		})
		disposables.push(() => client.close())

		const flush = () => {
			while (socketPair.getNeedsFlushing()) {
				socketPair.flushClientSentEvents()
				server.flushDebouncingMessages()
				socketPair.flushServerSentEvents()
			}
		}
		flush()
		return { store, seeded, rejected, flush }
	}

	it('reverts the push and reports the changes as the user made them', () => {
		const { store, seeded, rejected, flush } = makeClient((changes) => rejectAll(changes, 'no'))
		const created = Doc.create({ title: 'mine', ownerId: 'alice' })
		const edited = { ...seeded, title: 'edited' }

		store.put([created, edited])
		flush()

		expect(store.get(created.id)).toBeUndefined()
		expect(store.get(seeded.id)).toEqual(seeded)
		expect(rejected).toEqual([
			{
				rejections: expect.arrayContaining([
					{ id: created.id, reason: 'no' },
					{ id: seeded.id, reason: 'no' },
				]),
				changes: {
					added: { [created.id]: created },
					updated: { [seeded.id]: [seeded, edited] },
					removed: {},
				},
			},
		])
	})

	it('reports a rejected delete as removed', () => {
		const { store, seeded, rejected, flush } = makeClient((changes) => rejectAll(changes, 'no'))

		store.remove([seeded.id])
		flush()

		expect(store.get(seeded.id)).toEqual(seeded)
		expect(rejected[0].changes).toEqual({
			added: {},
			updated: {},
			removed: { [seeded.id]: seeded },
		})
	})

	it('reports nothing for an accepted push', () => {
		const { store, rejected, flush } = makeClient(() => [])

		const created = Doc.create({ title: 'mine', ownerId: 'alice' })
		store.put([created])
		flush()

		expect(store.get(created.id)).toEqual(created)
		expect(rejected).toEqual([])
	})
})
