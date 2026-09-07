import { computed } from '@tldraw/state'
import { BaseRecord, RecordId, Store, StoreSchema, createRecordType } from '@tldraw/store'
import { afterEach, describe, expect, it } from 'vitest'
import { TLSyncClient } from '../lib/TLSyncClient'
import { TestServer } from './TestServer'
import { TestSocketPair } from './TestSocketPair'

// `flushChanges` exists because pushes are throttled — to one per second while the session is the
// room's only one, and not at all in a tab with no animation frames — so a change can be seconds
// old and still be nowhere but the tab that made it. Anything reading the document from the server
// and expecting the user's latest edit has to be able to wait for it.
//
// Under NODE_ENV=test the throttles are pass-through, so the push itself is synchronous and what
// these exercise is the waiting: the promise must not settle until the server has acked, because
// the ack is the only thing that makes the read safe.

interface TestDoc extends BaseRecord<'doc', RecordId<TestDoc>> {
	text: string
}
const TestDocType = createRecordType<TestDoc>('doc', {
	scope: 'document',
	validator: { validate: (value) => value as TestDoc },
})
const testSchema = StoreSchema.create<TestDoc>({ doc: TestDocType })

const disposables: Array<() => void> = []
afterEach(() => {
	while (disposables.length) disposables.pop()!()
})

function makeInstance() {
	const doc0 = TestDocType.create({ id: TestDocType.createId('a'), text: 'start' })
	const server = new TestServer<TestDoc>(testSchema, {
		documents: [{ state: doc0, lastChangedClock: 0 }],
		clock: 0,
		documentClock: 0,
		schema: testSchema.serialize(),
	})
	const socketPair = new TestSocketPair<TestDoc>('flush-test', server)
	socketPair.connect()

	const store = new Store<TestDoc>({ schema: testSchema, props: {} })
	const client = new TLSyncClient<TestDoc>({
		store,
		socket: socketPair.clientSocket,
		presence: computed('presence', () => null),
		onLoad: () => {},
		onSyncError: (reason) => {
			throw new Error(`unexpected sync error: ${reason}`)
		},
	})
	disposables.push(() => client.close())

	while (socketPair.getNeedsFlushing()) {
		socketPair.flushClientSentEvents()
		socketPair.flushServerSentEvents()
	}

	return { server, socketPair, client, store, docId: doc0.id }
}

/** Whether a promise has settled, without awaiting one that may never settle. */
function watch(promise: Promise<void>) {
	const state = { settled: false, rejected: false }
	promise.then(
		() => (state.settled = true),
		() => {
			state.settled = true
			state.rejected = true
		}
	)
	return state
}

describe('TLSyncClient.flushChanges', () => {
	it('resolves straight away when the server already has everything', async () => {
		const { client } = makeInstance()

		expect(client.hasUnsyncedChanges()).toBe(false)
		await expect(client.flushChanges()).resolves.toBeUndefined()
	})

	it('does not resolve while the server has not acked the change', async () => {
		const { client, store, docId } = makeInstance()
		store.update(docId, (doc) => ({ ...doc, text: 'edited' }))

		expect(client.hasUnsyncedChanges()).toBe(true)
		const flush = watch(client.flushChanges())
		// A microtask is all an already-resolved promise would need.
		await Promise.resolve()

		expect(flush.settled).toBe(false)
	})

	it('resolves once the server acks the change', async () => {
		const { client, socketPair, store, docId } = makeInstance()
		store.update(docId, (doc) => ({ ...doc, text: 'edited' }))

		const flushed = client.flushChanges()
		while (socketPair.getNeedsFlushing()) {
			socketPair.flushClientSentEvents()
			socketPair.flushServerSentEvents()
		}

		await expect(flushed).resolves.toBeUndefined()
		expect(client.hasUnsyncedChanges()).toBe(false)
	})

	// Closing abandons the socket, so a caller waiting to read the change back must be told rather
	// than left waiting on an ack that is never coming.
	it('rejects a pending flush when the client closes', async () => {
		const { client, store, docId } = makeInstance()
		store.update(docId, (doc) => ({ ...doc, text: 'edited' }))

		const flushed = client.flushChanges()
		client.close()

		await expect(flushed).rejects.toThrow('sync client closed with changes still unsent')
	})
})
