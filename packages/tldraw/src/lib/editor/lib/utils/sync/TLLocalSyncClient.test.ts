import { PageRecordType } from '@tldraw/tlschema'
import { promiseWithResolve } from '@tldraw/utils'
import { createTLStore } from '../../config/createTLStore'
import { TLLocalSyncClient } from './TLLocalSyncClient'
import * as idb from './indexedDb'

jest.mock('./indexedDb', () => ({
	...jest.requireActual('./indexedDb'),
	storeSnapshotInIndexedDb: jest.fn(() => Promise.resolve()),
	storeChangesInIndexedDb: jest.fn(() => Promise.resolve()),
}))

class BroadcastChannelMock {
	onmessage?: (e: MessageEvent) => void
	constructor(_name: string) {
		// noop
	}
	postMessage = jest.fn((_msg: any) => {
		// noop
	})
	close = jest.fn(() => {
		// noop
	})
}

function testClient(channel = new BroadcastChannelMock('test')) {
	const store = createTLStore({ shapeUtils: [] })
	const onLoad = jest.fn(() => {
		return
	})
	const onLoadError = jest.fn(() => {
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
	return { client, store, onLoad, onLoadError, channel }
}

const reloadMock = jest.fn()

beforeAll(() => {
	Object.defineProperty(window, 'location', {
		configurable: true,
		value: { reload: reloadMock },
	})
})

beforeEach(() => {
	jest.clearAllMocks()
})

jest.useFakeTimers()

const tick = async () => {
	jest.advanceTimersByTime(1000)
	await Promise.resolve()
}

test('the client connects on instantiation, announcing its schema', async () => {
	const { channel } = testClient()
	await tick()
	expect(channel.postMessage).toHaveBeenCalledTimes(1)
	const [msg] = channel.postMessage.mock.calls[0]

	expect(msg).toMatchObject({ type: 'announce', schema: { recordVersions: {} } })
})

test('when a client receives an announce with a newer schema version it reloads itself', async () => {
	const { client, channel, onLoadError } = testClient()
	await tick()
	jest.advanceTimersByTime(10000)
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
	const { client, channel, onLoadError } = testClient()
	await tick()
	jest.advanceTimersByTime(1000)
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
	const { client } = testClient()
	await tick()
	client.store.put([PageRecordType.create({ name: 'test', index: 'a0' })])
	await tick()
	expect(idb.storeSnapshotInIndexedDb).toHaveBeenCalledTimes(1)
	expect(idb.storeChangesInIndexedDb).not.toHaveBeenCalled()

	client.store.put([PageRecordType.create({ name: 'test2', index: 'a1' })])
	await tick()
	expect(idb.storeSnapshotInIndexedDb).toHaveBeenCalledTimes(1)
	expect(idb.storeChangesInIndexedDb).toHaveBeenCalledTimes(1)
})

test('it clears the diff queue after every write', async () => {
	const { client } = testClient()
	await tick()
	client.store.put([PageRecordType.create({ name: 'test', index: 'a0' })])
	await tick()
	// @ts-expect-error
	expect(client.diffQueue.length).toBe(0)

	client.store.put([PageRecordType.create({ name: 'test2', index: 'a1' })])
	await tick()
	// @ts-expect-error
	expect(client.diffQueue.length).toBe(0)
})

test('writes that come in during a persist operation will get persisted afterward', async () => {
	const idbOperationResult = promiseWithResolve<void>()
	;(idb.storeSnapshotInIndexedDb as jest.Mock).mockImplementationOnce(() => idbOperationResult)

	const { client } = testClient()
	await tick()
	client.store.put([PageRecordType.create({ name: 'test', index: 'a0' })])
	await tick()

	// we should have called into idb but not resolved the promise yet
	expect(idb.storeSnapshotInIndexedDb).toHaveBeenCalledTimes(1)
	expect(idb.storeChangesInIndexedDb).toHaveBeenCalledTimes(0)

	// if another change comes in, loads of time can pass, but nothing else should get called
	client.store.put([PageRecordType.create({ name: 'test', index: 'a2' })])
	await tick()
	expect(idb.storeSnapshotInIndexedDb).toHaveBeenCalledTimes(1)
	expect(idb.storeChangesInIndexedDb).toHaveBeenCalledTimes(0)

	// if we resolve the idb operation, the next change should get persisted
	idbOperationResult.resolve()
	await tick()
	await tick()
	expect(idb.storeChangesInIndexedDb).toHaveBeenCalledTimes(1)
})
