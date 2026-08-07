import { atom } from '@tldraw/state'
import { Store } from '@tldraw/store'
import {
	DocumentRecordType,
	PageRecordType,
	TLDOCUMENT_ID,
	TLRecord,
	createTLSchema,
} from '@tldraw/tlschema'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TestServer } from '../test/TestServer'
import { TestSocketPair } from '../test/TestSocketPair'
import { TLConnectRequest, TLSocketServerSentEvent } from './protocol'
import { TLSyncClient } from './TLSyncClient'
import { RoomSnapshot } from './TLSyncRoom'

// These tests express SPEC.md rule CL2a: a client whose store was pre-hydrated from a snapshot
// can seed `lastServerClock` and either catch up incrementally (wipe_presence) or degrade safely
// to a full resync (wipe_all) — in both cases keeping edits made before the first connect.

const schema = createTLSchema()

const documentRecord = DocumentRecordType.create({ id: TLDOCUMENT_ID, gridSize: 10 })
const page1 = PageRecordType.create({
	id: PageRecordType.createId('page1'),
	name: 'Page 1',
	index: 'a1' as any,
})
const lateArrivingPage = PageRecordType.create({
	id: PageRecordType.createId('late'),
	name: 'Late page',
	index: 'a2' as any,
})

function makeServer(snapshot: RoomSnapshot) {
	return new TestServer<TLRecord>(schema, snapshot)
}

function makeStore() {
	return new Store<TLRecord, any>({
		schema,
		props: {
			defaultName: 'test',
			assets: {
				upload: async () => ({ src: 'mock://test' }),
				resolve: (asset: any) => asset.src || 'mock://resolved',
				remove: async () => {},
			},
			onMount: () => {},
		},
	})
}

describe('TLSyncClient with a seeded lastServerClock', () => {
	let client: TLSyncClient<TLRecord, Store<TLRecord, any>> | undefined

	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		client?.close()
		client = undefined
		vi.useRealTimers()
	})

	function createSeededClient(
		store: Store<TLRecord, any>,
		pair: TestSocketPair<TLRecord>,
		lastServerClock: number
	) {
		client = new TLSyncClient<TLRecord, Store<TLRecord, any>>({
			store,
			socket: pair.clientSocket,
			presence: atom('presence', null),
			lastServerClock,
			onLoad: vi.fn(),
			onSyncError: vi.fn((reason) => {
				throw new Error('onSyncError: ' + reason)
			}),
		})
		return client
	}

	/** Wrap the socket's message callback to record everything the client receives. */
	function recordReceivedMessages(pair: TestSocketPair<TLRecord>) {
		const received: TLSocketServerSentEvent<TLRecord>[] = []
		const inner = pair.callbacks.onReceiveMessage!
		pair.callbacks.onReceiveMessage = (msg) => {
			received.push(msg)
			inner(msg)
		}
		return received
	}

	it('[CL2a] sends the seeded clock in the connect request', async () => {
		const server = makeServer({
			documents: [
				{ state: documentRecord, lastChangedClock: 1 },
				{ state: page1, lastChangedClock: 1 },
			],
			clock: 10,
			documentClock: 10,
			tombstoneHistoryStartsAtClock: 0,
			schema: schema.serialize(),
		})
		const pair = new TestSocketPair('seed-test', server)
		const store = makeStore()
		store.mergeRemoteChanges(() => store.put([documentRecord, page1]))

		createSeededClient(store, pair, 10)
		pair.connect()

		const connectMsg = pair.clientSentEventQueue.find(
			(m) => m.type === 'connect'
		) as TLConnectRequest
		expect(connectMsg).toBeDefined()
		expect(connectMsg.lastServerClock).toBe(10)
	})

	it('[CL2a] catches up incrementally (wipe_presence) when the seed is within tombstone history', async () => {
		const server = makeServer({
			documents: [
				{ state: documentRecord, lastChangedClock: 1 },
				{ state: page1, lastChangedClock: 1 },
				{ state: lateArrivingPage, lastChangedClock: 12 },
			],
			clock: 12,
			documentClock: 12,
			tombstoneHistoryStartsAtClock: 0,
			schema: schema.serialize(),
		})
		const pair = new TestSocketPair('seed-test', server)
		const store = makeStore()
		// The snapshot the client fetched was at clock 10: it has page1 but not the late page.
		store.mergeRemoteChanges(() => store.put([documentRecord, page1]))

		createSeededClient(store, pair, 10)
		const received = recordReceivedMessages(pair)
		pair.connect()
		await pair.flushAllEvents()

		const connectResponse = received.find((m) => m.type === 'connect')
		expect(connectResponse).toBeDefined()
		expect(connectResponse).toMatchObject({ hydrationType: 'wipe_presence' })
		// The incremental diff carries only what changed after the seed
		expect(Object.keys((connectResponse as any).diff)).toEqual([lateArrivingPage.id])
		expect(store.get(lateArrivingPage.id)).toMatchObject({ name: 'Late page' })
		expect(store.get(page1.id)).toMatchObject({ name: 'Page 1' })
	})

	it('[CL2a][CP3] pushes edits made while detached after the first connect', async () => {
		const server = makeServer({
			documents: [
				{ state: documentRecord, lastChangedClock: 1 },
				{ state: page1, lastChangedClock: 1 },
			],
			clock: 10,
			documentClock: 10,
			tombstoneHistoryStartsAtClock: 0,
			schema: schema.serialize(),
		})
		const pair = new TestSocketPair('seed-test', server)
		const store = makeStore()
		store.mergeRemoteChanges(() => store.put([documentRecord, page1]))

		createSeededClient(store, pair, 10)

		// User edits while no socket exists — captured as speculative changes
		const offlinePage = PageRecordType.create({
			id: PageRecordType.createId('offline'),
			name: 'Offline page',
			index: 'a3' as any,
		})
		store.put([offlinePage])
		vi.advanceTimersByTime(100)
		expect(pair.clientSentEventQueue).toHaveLength(0)

		pair.connect()
		await pair.flushAllEvents()
		vi.advanceTimersByTime(100)
		await pair.flushAllEvents()

		// The server room now has the offline edit
		const serverDocs = server.storage.getSnapshot().documents.map((d) => d.state.id)
		expect(serverDocs).toContain(offlinePage.id)
		expect(store.get(offlinePage.id)).toMatchObject({ name: 'Offline page' })
	})

	it('[CL2a][CL6] a stale seed degrades to wipe_all: snapshot records are replaced, detached edits survive', async () => {
		const server = makeServer({
			documents: [
				{ state: documentRecord, lastChangedClock: 1 },
				{ state: page1, lastChangedClock: 1 },
			],
			clock: 20,
			documentClock: 20,
			// Tombstone history starts after the client's seed, so no incremental diff is possible
			tombstoneHistoryStartsAtClock: 15,
			schema: schema.serialize(),
		})
		const pair = new TestSocketPair('seed-test', server)
		const store = makeStore()
		// A record the server no longer has, hydrated before the client exists — it is NOT a user
		// change, so a full resync is expected to remove it
		const zombiePage = PageRecordType.create({
			id: PageRecordType.createId('zombie'),
			name: 'Zombie page',
			index: 'a4' as any,
		})
		store.mergeRemoteChanges(() => store.put([documentRecord, page1, zombiePage]))

		createSeededClient(store, pair, 10)
		const received = recordReceivedMessages(pair)

		// A user edit made while detached — this must survive the wipe
		const offlinePage = PageRecordType.create({
			id: PageRecordType.createId('offline'),
			name: 'Offline page',
			index: 'a5' as any,
		})
		store.put([offlinePage])
		vi.advanceTimersByTime(100)

		pair.connect()
		await pair.flushAllEvents()
		vi.advanceTimersByTime(100)
		await pair.flushAllEvents()

		const connectResponse = received.find((m) => m.type === 'connect')
		expect(connectResponse).toMatchObject({ hydrationType: 'wipe_all' })
		// Snapshot-hydrated state was replaced by the server's
		expect(store.get(zombiePage.id)).toBeUndefined()
		// ...but the detached user edit survived and reached the server
		expect(store.get(offlinePage.id)).toMatchObject({ name: 'Offline page' })
		const serverDocs = server.storage.getSnapshot().documents.map((d) => d.state.id)
		expect(serverDocs).toContain(offlinePage.id)
	})
})
