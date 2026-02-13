import { PageRecordType } from '@tldraw/tlschema'
import { IndexKey, promiseWithResolve } from '@tldraw/utils'
import { Mock, vi } from 'vitest'
import { createTLStore } from '../../config/createTLStore'
import { TLLocalSyncClient } from './TLLocalSyncClient'
import { hardReset } from './hardReset'

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
