import { TLRecord } from '@tldraw/tlschema'
import { beforeEach, describe, expect, it } from 'vitest'
import { TLSocketClientSentEvent, TLSocketServerSentEvent } from '../protocol'
import { TLPersistentClientSocketStatus } from '../TLSyncClient'
import {
	buildTab,
	createMockBrowserContext,
	createMockChannelFactory,
	createMockLockManager,
	FakeSocket,
	flushMicrotasks,
} from './testDoubles'
import { CrossTabLockManager } from './types'

describe('createCrossTabSocket: fallback mode', () => {
	it('uses a per-tab socket when locks are unavailable', async () => {
		const channels = createMockChannelFactory()
		const sockets: FakeSocket[] = []
		const a = buildTab({
			channels,
			locks: null as any, // null forces fallback
			channelKey: 'room1',
			tabId: 'A',
			sockets,
		})

		expect(a.mode).toBe('fallback')
		expect(sockets).toHaveLength(1)

		// sendMessage goes straight to the underlying socket.
		a.sendMessage({ type: 'ping' })
		expect(sockets[0].sent).toEqual([{ type: 'ping' }])

		a.close()
	})

	it('two fallback tabs each open their own socket', async () => {
		const channels = createMockChannelFactory()
		const sockets: FakeSocket[] = []
		const a = buildTab({
			channels,
			locks: null as any,
			channelKey: 'room1',
			tabId: 'A',
			sockets,
		})
		const b = buildTab({
			channels,
			locks: null as any,
			channelKey: 'room1',
			tabId: 'B',
			sockets,
		})

		expect(sockets).toHaveLength(2)
		expect(a.mode).toBe('fallback')
		expect(b.mode).toBe('fallback')

		a.close()
		b.close()
	})
})


describe('createCrossTabSocket: cleanup', () => {
	it('close() releases the lock', async () => {
		const channels = createMockChannelFactory()
		const locks = createMockLockManager() as any
		const sockets: FakeSocket[] = []

		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()

		expect(locks.holders.get('tldraw-leader-room1')).not.toBeNull()
		a.close()
		await flushMicrotasks()
		expect(locks.holders.get('tldraw-leader-room1')).toBeNull()
	})

	it('after close(), sendMessage throws', async () => {
		const channels = createMockChannelFactory()
		const locks = createMockLockManager()
		const sockets: FakeSocket[] = []

		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()
		a.close()

		expect(() => a.sendMessage({ type: 'ping' })).toThrow()
	})
})
