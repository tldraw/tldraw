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

test('pagehide flushes pending changes without waiting for the throttle', async () => {
	const { client, tick } = testClient()
	await tick()
	client.store.put([PageRecordType.create({ name: 'test', index: 'a0' as IndexKey })])
	await tick()
	expect(client.db.storeSnapshot).toHaveBeenCalledTimes(1)

	client.store.put([PageRecordType.create({ name: 'test2', index: 'a1' as IndexKey })])
	expect(client.db.storeChanges).not.toHaveBeenCalled()

	window.dispatchEvent(new Event('pagehide'))
	expect(client.db.storeChanges).toHaveBeenCalledTimes(1)
})

test('hiding the tab flushes pending changes without waiting for the throttle', async () => {
	const { client, tick } = testClient()
	await tick()
	client.store.put([PageRecordType.create({ name: 'test', index: 'a0' as IndexKey })])
	await tick()
	expect(client.db.storeSnapshot).toHaveBeenCalledTimes(1)

	client.store.put([PageRecordType.create({ name: 'test2', index: 'a1' as IndexKey })])
	expect(client.db.storeChanges).not.toHaveBeenCalled()

	const visibilityState = vi.spyOn(document, 'visibilityState', 'get')
	try {
		visibilityState.mockReturnValue('hidden')
		document.dispatchEvent(new Event('visibilitychange'))
		expect(client.db.storeChanges).toHaveBeenCalledTimes(1)
	} finally {
		visibilityState.mockRestore()
	}
})

test('pagehide does not write before the initial load has completed', async () => {
	const { client } = testClient()
	window.dispatchEvent(new Event('pagehide'))
	expect(client.db.storeSnapshot).not.toHaveBeenCalled()
	expect(client.db.storeChanges).not.toHaveBeenCalled()
})

test('diffs received while the client is still loading are applied once it has loaded', async () => {
	const { client, channel, tick } = testClient()
	const remotePage = PageRecordType.create({ name: 'remote', index: 'a0' as IndexKey })
	channel.onmessage?.({
		data: {
			type: 'diff',
			storeId: 'other-tab',
			schema: client.serializedSchema,
			changes: { added: { [remotePage.id]: remotePage }, updated: {}, removed: {} },
		},
	} as any)
	expect(client.store.get(remotePage.id)).toBeUndefined()

	await tick()
	expect(client.store.get(remotePage.id)).toEqual(remotePage)

	// and the first (full) db write includes them rather than overwriting them
	client.store.put([PageRecordType.create({ name: 'local', index: 'a1' as IndexKey })])
	await tick()
	expect(client.db.storeSnapshot).toHaveBeenCalledTimes(1)
	expect(client.db.storeSnapshot.mock.calls[0][0].snapshot[remotePage.id]).toEqual(remotePage)
})

test('closing the client persists changes that are still queued', async () => {
	const { client, tick } = testClient()
	await tick()
	client.store.put([PageRecordType.create({ name: 'test', index: 'a0' as IndexKey })])
	expect(client.db.storeSnapshot).not.toHaveBeenCalled()

	// close before the throttled persist fires
	client.close()
	expect(client.db.storeSnapshot).toHaveBeenCalledTimes(1)
})

test('closing the client while a persist is in flight still persists edits queued during the write', async () => {
	const idbOperationResult = promiseWithResolve<void>()
	const { client, tick } = testClient()
	client.db.storeSnapshot.mockImplementationOnce(() => idbOperationResult)
	const closeDb = vi.spyOn(client.db, 'close')

	await tick()
	client.store.put([PageRecordType.create({ name: 'test', index: 'a0' as IndexKey })])
	await tick()
	expect(client.db.storeSnapshot).toHaveBeenCalledTimes(1)

	// an edit made while the first write is still in flight, then unmount
	const page = PageRecordType.create({ name: 'test2', index: 'a1' as IndexKey })
	client.store.put([page])
	client.close()
	expect(client.db.storeChanges).not.toHaveBeenCalled()
	expect(closeDb).not.toHaveBeenCalled()

	idbOperationResult.resolve()
	await tick()
	expect(client.db.storeChanges).toHaveBeenCalledTimes(1)
	expect(client.db.storeChanges.mock.calls[0][0].changes.added[page.id]).toEqual(page)
	expect(closeDb).toHaveBeenCalledTimes(1)
})

test('closing the client with nothing queued does not write to the db', async () => {
	const { client, tick } = testClient()
	await tick()
	client.close()
	expect(client.db.storeSnapshot).not.toHaveBeenCalled()
	expect(client.db.storeChanges).not.toHaveBeenCalled()
})

test('pagehide and visibilitychange listeners are removed when the client closes', async () => {
	const removeWindowListener = vi.spyOn(window, 'removeEventListener')
	const removeDocumentListener = vi.spyOn(document, 'removeEventListener')
	try {
		const { client, tick } = testClient()
		await tick()
		client.close()
		expect(removeWindowListener).toHaveBeenCalledWith('pagehide', expect.any(Function))
		expect(removeDocumentListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
	} finally {
		removeWindowListener.mockRestore()
		removeDocumentListener.mockRestore()
	}
})

test('closing the client before it has loaded does not write to the db', async () => {
	const { client, tick } = testClient()
	client.close()
	await tick()
	expect(client.db.storeSnapshot).not.toHaveBeenCalled()
	expect(client.db.storeChanges).not.toHaveBeenCalled()
})

test('closing flushes changes that have not reached the next animation frame', async () => {
	const { client, tick } = testClient()
	await tick()
	const page = PageRecordType.create({ name: 'last frame', index: 'a0' as IndexKey })
	vi.stubGlobal('__FORCE_RAF_IN_TESTS__', true)
	try {
		client.store.put([page])
		client.close()
		expect(client.db.storeSnapshot).toHaveBeenCalledTimes(1)
		expect(client.db.storeSnapshot.mock.calls[0][0].snapshot[page.id]).toEqual(page)
	} finally {
		vi.unstubAllGlobals()
	}
})

test('buffered schema announcements cannot persist before the remaining buffered diffs', async () => {
	const { client, channel, tick } = testClient()
	const page = PageRecordType.create({ name: 'remote', index: 'a0' as IndexKey })
	const schema = client.store.schema.serialize()
	channel.onmessage?.({
		data: {
			type: 'announce',
			schema: { ...schema, sequences: { ...schema.sequences, 'com.tldraw.page': 0 } },
		},
	} as MessageEvent)
	channel.onmessage?.({
		data: {
			type: 'diff',
			storeId: 'other-tab',
			schema: client.serializedSchema,
			changes: { added: { [page.id]: page }, updated: {}, removed: {} },
		},
	} as MessageEvent)
	await tick()
	expect(client.db.storeSnapshot).toHaveBeenCalledTimes(1)
	expect(client.db.storeSnapshot.mock.calls[0][0].snapshot[page.id]).toEqual(page)
	client.close()
})

test('closing before load cancels a persist scheduled by an early edit', async () => {
	const load = promiseWithResolve<Awaited<ReturnType<LocalIndexedDb['load']>>>()
	const loadMock = vi.spyOn(LocalIndexedDb.prototype, 'load').mockImplementationOnce(() => load)
	try {
		const { client, tick } = testClient()
		client.store.put([PageRecordType.create({ name: 'early', index: 'a0' as IndexKey })])
		client.close()
		load.resolve({ records: [], schema: undefined, sessionStateSnapshot: undefined })
		await tick()
		expect(client.db.storeSnapshot).not.toHaveBeenCalled()
		expect(client.db.storeChanges).not.toHaveBeenCalled()
	} finally {
		loadMock.mockRestore()
	}
})

test.each(['close flush', 'in-flight write'] as const)(
	'a failed %s after close logs the error without disrupting the current page',
	async (when) => {
		const { client, tick } = testClient()
		await tick()
		const write = promiseWithResolve<void>()
		client.db.storeSnapshot.mockImplementationOnce(() => write)
		const error = new Error('write failed')
		const log = vi.spyOn(console, 'error').mockImplementation(() => {})
		const alert = vi.spyOn(window, 'alert').mockImplementation(() => {})
		try {
			client.store.put([PageRecordType.create({ name: 'last edit', index: 'a0' as IndexKey })])
			if (when === 'in-flight write') await tick()
			client.close()
			write.reject(error)
			await tick()
			expect(log).toHaveBeenCalledWith('failed to store changes in indexed db', error)
			expect(alert).not.toHaveBeenCalled()
			expect(reloadMock).not.toHaveBeenCalled()
		} finally {
			log.mockRestore()
			alert.mockRestore()
		}
	}
)

test('closing with no queued changes cancels a failed-write retry', async () => {
	const { client, tick } = testClient()
	await tick()
	const log = vi.spyOn(console, 'error').mockImplementation(() => {})
	const alert = vi.spyOn(window, 'alert').mockImplementation(() => {})
	try {
		client.db.storeSnapshot.mockRejectedValueOnce(new Error('first write failed'))
		client.store.put([PageRecordType.create({ name: 'retry', index: 'a0' as IndexKey })])
		await tick()
		expect(reloadMock).toHaveBeenCalledTimes(1)
		client.close()
		await vi.advanceTimersByTimeAsync(10_000)
		expect(client.db.storeSnapshot).toHaveBeenCalledTimes(1)
	} finally {
		log.mockRestore()
		alert.mockRestore()
	}
})

test('a schema mismatch does not try to refresh without a window', async () => {
	const { client, channel, tick } = testClient()
	await tick()
	vi.advanceTimersByTime(10_000)
	vi.stubGlobal('window', undefined)
	try {
		expect(() =>
			channel.onmessage?.({
				data: {
					type: 'announce',
					schema: {
						...client.serializedSchema,
						schemaVersion: client.serializedSchema.schemaVersion + 1,
					},
				},
			} as MessageEvent)
		).not.toThrow()
	} finally {
		vi.unstubAllGlobals()
		client.close()
	}
})

test('onLoad can close the client without losing buffered remote changes', async () => {
	const { client, channel, onLoad, tick } = testClient()
	const page = PageRecordType.create({ name: 'remote', index: 'a0' as IndexKey })
	channel.onmessage?.({
		data: {
			type: 'diff',
			storeId: 'other-tab',
			schema: client.serializedSchema,
			changes: { added: { [page.id]: page }, updated: {}, removed: {} },
		},
	} as MessageEvent)
	onLoad.mockImplementation(() => {
		client.store.put([PageRecordType.create({ name: 'local', index: 'a1' as IndexKey })])
		client.close()
	})
	await tick()
	expect(client.db.storeSnapshot.mock.calls[0][0].snapshot[page.id]).toEqual(page)
})

test('a buffered newer schema reports a load error without announcing a successful load', async () => {
	const { client, channel, onLoad, onLoadError, tick } = testClient()
	channel.onmessage?.({
		data: {
			type: 'announce',
			schema: {
				...client.serializedSchema,
				schemaVersion: client.serializedSchema.schemaVersion + 1,
			},
		},
	} as MessageEvent)
	await tick()
	expect(onLoadError).toHaveBeenCalledTimes(1)
	expect(onLoad).not.toHaveBeenCalled()
	client.close()
	expect(client.db.storeSnapshot).not.toHaveBeenCalled()
})
