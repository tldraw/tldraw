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

describe('createLeader: leader election', () => {
	let channels: ReturnType<typeof createMockChannelFactory>
	let locks: CrossTabLockManager

	beforeEach(() => {
		channels = createMockChannelFactory()
		locks = createMockLockManager()
	})

	it('the first tab to request the lock becomes leader', async () => {
		const sockets: FakeSocket[] = []
		const a = buildTab({
			channels,
			locks,
			channelKey: 'room1',
			tabId: 'A',
			sockets,
		})
		await flushMicrotasks()

		expect(sockets).toHaveLength(1)
		expect(a.mode).toBe('leader')
		a.close()
	})

	it('subsequent tabs become followers', async () => {
		const sockets: FakeSocket[] = []
		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()
		const b = buildTab({ channels, locks, channelKey: 'room1', tabId: 'B', sockets })
		await flushMicrotasks()

		// Only one underlying socket exists (the leader's).
		expect(sockets).toHaveLength(1)
		expect(a.mode).toBe('leader')
		expect(b.mode).toBe('follower')
		a.close()
		b.close()
	})

	it('different rooms elect leaders independently', async () => {
		const sockets: FakeSocket[] = []
		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		const b = buildTab({ channels, locks, channelKey: 'room2', tabId: 'B', sockets })
		await flushMicrotasks()

		expect(a.mode).toBe('leader')
		expect(b.mode).toBe('leader')
		expect(sockets).toHaveLength(2)
		a.close()
		b.close()
	})

	it('when the leader closes, the next follower takes over', async () => {
		const sockets: FakeSocket[] = []
		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()
		const b = buildTab({ channels, locks, channelKey: 'room1', tabId: 'B', sockets })
		await flushMicrotasks()

		expect(a.mode).toBe('leader')
		expect(b.mode).toBe('follower')

		a.close()
		await flushMicrotasks()

		expect(b.mode).toBe('leader')
		// A new socket was opened by B.
		expect(sockets).toHaveLength(2)
		b.close()
	})
})

describe('createLeader: visibility-driven handoff', () => {
	let channels: ReturnType<typeof createMockChannelFactory>
	let locks: CrossTabLockManager & { holders: Map<string, { resolve: () => void } | null> }
	let sockets: FakeSocket[]

	beforeEach(() => {
		channels = createMockChannelFactory()
		locks = createMockLockManager()
		sockets = []
	})

	it('the leader releases the lock when it becomes hidden and another tab is visible', async () => {
		const aEnv = createMockBrowserContext({ focused: true, visible: true })
		const bEnv = createMockBrowserContext({ focused: false, visible: true })
		const a = buildTab({
			channels,
			locks,
			channelKey: 'room1',
			tabId: 'A',
			sockets,
			browserContext: aEnv.ctx,
		})
		await flushMicrotasks()
		const b = buildTab({
			channels,
			locks,
			channelKey: 'room1',
			tabId: 'B',
			sockets,
			browserContext: bEnv.ctx,
		})
		await flushMicrotasks()

		expect(a.mode).toBe('leader')
		expect(b.mode).toBe('follower')

		// A becomes hidden. B is still visible.
		aEnv.setVisible(false)
		await flushMicrotasks()

		// Lock should have migrated to B.
		expect(b.mode).toBe('leader')
		// Two sockets have been opened over the lifetime of the test.
		expect(sockets).toHaveLength(2)

		a.close()
		b.close()
	})

	it('a hidden tab keeps the lock if no other tab is visible', async () => {
		const aEnv = createMockBrowserContext({ focused: true, visible: true })
		const bEnv = createMockBrowserContext({ focused: false, visible: false })
		const a = buildTab({
			channels,
			locks,
			channelKey: 'room1',
			tabId: 'A',
			sockets,
			browserContext: aEnv.ctx,
		})
		await flushMicrotasks()
		const b = buildTab({
			channels,
			locks,
			channelKey: 'room1',
			tabId: 'B',
			sockets,
			browserContext: bEnv.ctx,
		})
		await flushMicrotasks()

		expect(a.mode).toBe('leader')

		// A becomes hidden — but B is also hidden, so A should hang onto the lock.
		aEnv.setVisible(false)
		await flushMicrotasks()

		expect(a.mode).toBe('leader')
		expect(sockets).toHaveLength(1)

		a.close()
		b.close()
	})

	it('a previously-hidden tab re-acquires the lock when it becomes visible again', async () => {
		const aEnv = createMockBrowserContext({ focused: true, visible: true })
		const bEnv = createMockBrowserContext({ focused: false, visible: true })
		const a = buildTab({
			channels,
			locks,
			channelKey: 'room1',
			tabId: 'A',
			sockets,
			browserContext: aEnv.ctx,
		})
		await flushMicrotasks()
		const b = buildTab({
			channels,
			locks,
			channelKey: 'room1',
			tabId: 'B',
			sockets,
			browserContext: bEnv.ctx,
		})
		await flushMicrotasks()

		// A is leader. A becomes hidden — hands off to B.
		aEnv.setVisible(false)
		await flushMicrotasks()
		expect(b.mode).toBe('leader')

		// A becomes visible again. It should request the lock; B keeps it for
		// now (B is still visible), so A waits in the queue. If B then becomes
		// hidden, A would take over.
		aEnv.setVisible(true)
		await flushMicrotasks()
		expect(b.mode).toBe('leader')

		bEnv.setVisible(false)
		await flushMicrotasks()
		expect(a.mode).toBe('leader')

		a.close()
		b.close()
	})
})

