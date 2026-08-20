import { PageRecordType } from '@tldraw/tlschema'
import { IndexKey, promiseWithResolve } from '@tldraw/utils'
import { Mock, vi } from 'vitest'
import { createTLStore } from '../../config/createTLStore'
import { hardReset } from './hardReset'
import { LocalIndexedDb } from './LocalIndexedDb'
import { TLLocalSyncClient } from './TLLocalSyncClient'

class BroadcastChannelMock {
	onmessage?: (e: MessageEvent) => void
	constructor(_name: string) {
		// noop
	}
	postMessage = vi.fn((_msg: any) => {
		// noop
	})
	close = vi.fn(() => {
		// noop
	})
}

function testClient(channel = new BroadcastChannelMock('test')) {
	const store = createTLStore({ shapeUtils: [], bindingUtils: [] })
	const onLoad = vi.fn(() => {
		return
	})
	const onLoadError = vi.fn(() => {
		return
	})
	const client = new TLLocalSyncClient(
		store,
		{
			onLoad,
			onLoadError,
			persistenceKey: 'test',
		},
		channel
	)

	client.db.storeSnapshot = vi.fn(() => Promise.resolve())
	client.db.storeChanges = vi.fn(() => Promise.resolve())

	return {
		client: client as { db: { storeSnapshot: Mock; storeChanges: Mock } } & typeof client,
		store,
		onLoad,
		onLoadError,
		channel,
		tick: async () => {
			vi.advanceTimersByTime(500)
			await Promise.resolve()
			await client.db.pending()
			vi.advanceTimersByTime(500)
			await Promise.resolve()
		},
	}
}

const reloadMock = vi.fn()

beforeAll(() => {
	Object.defineProperty(window, 'location', {
		configurable: true,
		value: { reload: reloadMock },
	})
})

beforeEach(() => {
	vi.clearAllMocks()
})

afterEach(async () => {
	await hardReset({ shouldReload: false })
})

vi.useFakeTimers()

test('the client connects on instantiation, announcing its schema', async () => {
	const { channel, tick } = testClient()
	await tick()
	expect(channel.postMessage).toHaveBeenCalledTimes(1)
	const [msg] = channel.postMessage.mock.calls[0]

	expect(msg).toMatchObject({ type: 'announce', schema: {} })
})

test('when a client receives an announce with a newer schema version it reloads itself', async () => {
	const { client, channel, onLoadError, tick } = testClient()
	await tick()
	vi.advanceTimersByTime(10000)
	expect(reloadMock).not.toHaveBeenCalled()
	channel.onmessage?.({
		data: {
			type: 'announce',
			schema: {
				...client.serializedSchema,
				schemaVersion: client.serializedSchema.schemaVersion + 1,
			},
		},
	} as any)
	expect(reloadMock).toHaveBeenCalled()
	expect(onLoadError).not.toHaveBeenCalled()
})

test('when a client receives an announce with a newer schema version shortly after loading it does not reload but instead reports a loadError', async () => {
	const { client, channel, onLoadError, tick } = testClient()
	await tick()
	vi.advanceTimersByTime(1000)
	expect(reloadMock).not.toHaveBeenCalled()
	channel.onmessage?.({
		data: {
			type: 'announce',
			schema: {
				...client.serializedSchema,
				schemaVersion: client.serializedSchema.schemaVersion + 1,
			},
		},
	} as any)
	expect(reloadMock).not.toHaveBeenCalled()
	expect(onLoadError).toHaveBeenCalled()
})

test('the first db write after a client connects is a full db overwrite', async () => {
	const { client, tick } = testClient()
	await tick()
	client.store.put([PageRecordType.create({ name: 'test', index: 'a0' as IndexKey })])
	await tick()
	expect(client.db.storeSnapshot).toHaveBeenCalledTimes(1)
	expect(client.db.storeChanges).not.toHaveBeenCalled()

	client.store.put([PageRecordType.create({ name: 'test2', index: 'a1' as IndexKey })])
	await tick()
	expect(client.db.storeSnapshot).toHaveBeenCalledTimes(1)
	expect(client.db.storeChanges).toHaveBeenCalledTimes(1)
})

test('it clears the diff queue after every write', async () => {
	const { client, tick } = testClient()
	await tick()
	client.store.put([PageRecordType.create({ name: 'test', index: 'a0' as IndexKey })])
	await tick()
	// @ts-expect-error
	expect(client.diffQueue.length).toBe(0)

	client.store.put([PageRecordType.create({ name: 'test2', index: 'a1' as IndexKey })])
	await tick()
	// @ts-expect-error
	expect(client.diffQueue.length).toBe(0)
})

test('writes that come in during a persist operation will get persisted afterward', async () => {
	const idbOperationResult = promiseWithResolve<void>()

	const { client, tick } = testClient()
	client.db.storeSnapshot.mockImplementationOnce(() => idbOperationResult)

	await tick()
	client.store.put([PageRecordType.create({ name: 'test', index: 'a0' as IndexKey })])
	await tick()

	// we should have called into idb but not resolved the promise yet
	expect(client.db.storeSnapshot).toHaveBeenCalledTimes(1)
	expect(client.db.storeChanges).toHaveBeenCalledTimes(0)

	// if another change comes in, loads of time can pass, but nothing else should get called
	client.store.put([PageRecordType.create({ name: 'test', index: 'a2' as IndexKey })])
	await tick()
	expect(client.db.storeSnapshot).toHaveBeenCalledTimes(1)
	expect(client.db.storeChanges).toHaveBeenCalledTimes(0)

	// if we resolve the idb operation, the next change should get persisted
	idbOperationResult.resolve()
	await tick()
	expect(client.db.storeChanges).toHaveBeenCalledTimes(1)
})

test('a diff broadcast by another tab while the initial load is in flight is applied once loading finishes', async () => {
	const { client, store, channel, tick } = testClient()
	// nothing has loaded yet, but the channel is already listened to
	expect(channel.onmessage).toBeDefined()
	const page = PageRecordType.create({ name: 'from other tab', index: 'a5' as IndexKey })
	channel.onmessage!({
		data: {
			type: 'diff',
			storeId: 'other',
			schema: client.serializedSchema,
			changes: { added: { [page.id]: page }, updated: {}, removed: {} },
		},
	} as any)
	expect(store.get(page.id)).toBeUndefined()

	await tick()
	// once loaded, the held-back diff is applied — the first (full snapshot) write must not
	// erase what the other tab persisted meanwhile
	expect(store.get(page.id)).toEqual(page)
})

test('a tab that reports a schema mismatch on load stops writing to the database', async () => {
	const { client, channel, onLoadError, tick } = testClient()
	await tick()
	channel.onmessage?.({
		data: {
			type: 'announce',
			schema: {
				...client.serializedSchema,
				schemaVersion: client.serializedSchema.schemaVersion + 1,
			},
		},
	} as any)
	expect(onLoadError).toHaveBeenCalled()

	client.store.put([PageRecordType.create({ name: 'stale', index: 'a0' as IndexKey })])
	await tick()
	expect(client.db.storeSnapshot).not.toHaveBeenCalled()
	expect(client.db.storeChanges).not.toHaveBeenCalled()
})

test('close() writes out changes that are still queued behind the persist throttle', async () => {
	const { client, tick } = testClient()
	await tick()
	client.store.put([PageRecordType.create({ name: 'last edit', index: 'a0' as IndexKey })])
	// no throttle tick has elapsed yet
	expect(client.db.storeSnapshot).not.toHaveBeenCalled()

	client.close()
	expect(client.db.storeSnapshot).toHaveBeenCalledTimes(1)
})

test('close() while a write is in flight still writes the edits queued behind it before closing the db', async () => {
	const inFlightWrite = promiseWithResolve<void>()
	const { client, tick } = testClient()
	client.db.storeSnapshot.mockImplementationOnce(() => inFlightWrite)
	await tick()

	client.store.put([PageRecordType.create({ name: 'first', index: 'a0' as IndexKey })])
	await tick()
	expect(client.db.storeSnapshot).toHaveBeenCalledTimes(1) // in flight
	client.store.put([PageRecordType.create({ name: 'during write', index: 'a1' as IndexKey })])

	const dbCloseSpy = vi.spyOn(client.db, 'close')
	client.close()
	expect(client.db.storeChanges).not.toHaveBeenCalled()
	expect(dbCloseSpy).not.toHaveBeenCalled()

	inFlightWrite.resolve()
	await tick()
	// the queued edit was written once the in-flight write finished, then the db was closed
	expect(client.db.storeChanges).toHaveBeenCalledTimes(1)
	for (let i = 0; i < 10; i++) await Promise.resolve()
	expect(dbCloseSpy).toHaveBeenCalledTimes(1)
})

test('a schema mismatch reported by a message held back during load is not overridden by onLoad', async () => {
	const { client, channel, onLoad, onLoadError, tick } = testClient()
	channel.onmessage!({
		data: {
			type: 'announce',
			schema: {
				...client.serializedSchema,
				schemaVersion: client.serializedSchema.schemaVersion + 1,
			},
		},
	} as any)
	await tick()
	expect(onLoadError).toHaveBeenCalledTimes(1)
	expect(onLoad).not.toHaveBeenCalled()
})

test('close() before the initial load has finished never writes', async () => {
	const { client } = testClient()
	client.store.put([PageRecordType.create({ name: 'too early', index: 'a0' as IndexKey })])
	client.close()
	// a full-snapshot write of a not-yet-loaded store would wipe the saved document
	expect(client.db.storeSnapshot).not.toHaveBeenCalled()
	expect(client.db.storeChanges).not.toHaveBeenCalled()
})

test('a client created on the same key while a closed client is still flushing does not load until that flush has landed', async () => {
	const inFlightWrite = promiseWithResolve<void>()
	const { client, tick } = testClient()
	client.db.storeSnapshot.mockImplementationOnce(() => inFlightWrite)
	await tick()
	client.store.put([PageRecordType.create({ name: 'first', index: 'a0' as IndexKey })])
	await tick()
	expect(client.db.storeSnapshot).toHaveBeenCalledTimes(1) // in flight
	client.store.put([PageRecordType.create({ name: 'during write', index: 'a1' as IndexKey })])
	client.close()

	// remount on the same key while the old client is still waiting to flush its queue
	const loadSpy = vi.spyOn(LocalIndexedDb.prototype, 'load')
	const next = testClient()
	await tick()
	// reading now would miss the queued edit, and the new client's first (full snapshot) write
	// would then erase it
	expect(loadSpy).not.toHaveBeenCalled()
	expect(next.onLoad).not.toHaveBeenCalled()

	inFlightWrite.resolve()
	await tick()
	expect(client.db.storeChanges).toHaveBeenCalledTimes(1)
	for (let i = 0; i < 20; i++) await Promise.resolve()
	await next.tick()
	expect(loadSpy).toHaveBeenCalledTimes(1)
	expect(next.onLoad).toHaveBeenCalledTimes(1)
	loadSpy.mockRestore()
})
