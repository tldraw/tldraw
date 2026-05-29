import { TLRecord } from '@tldraw/tlschema'
import { beforeEach, describe, expect, it } from 'vitest'
import { TLSocketClientSentEvent, TLSocketServerSentEvent } from '../protocol'
import { TLPersistentClientSocketStatus } from '../TLSyncClient'
import {
	buildTab,
	createMockChannelFactory,
	createMockLockManager,
	FakeSocket,
	flushMicrotasks,
} from './testDoubles'
import { CrossTabLockManager } from './types'

describe('createLeaderRouter: message routing', () => {
	let channels: ReturnType<typeof createMockChannelFactory>
	let locks: CrossTabLockManager
	let sockets: FakeSocket[]

	beforeEach(() => {
		channels = createMockChannelFactory()
		locks = createMockLockManager()
		sockets = []
	})

	it("forwards leader's own sendMessage to its socket", async () => {
		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()

		a.sendMessage({ type: 'ping' })
		expect(sockets[0].sent).toEqual([{ type: 'ping' }])
		a.close()
	})

	it("forwards a follower's sendMessage through the leader's socket", async () => {
		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()
		const b = buildTab({ channels, locks, channelKey: 'room1', tabId: 'B', sockets })
		await flushMicrotasks()

		b.sendMessage({ type: 'ping' })
		expect(sockets[0].sent).toEqual([{ type: 'ping' }])
		a.close()
		b.close()
	})

	it('remaps push clientClocks so concurrent followers do not collide', async () => {
		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()
		const b = buildTab({ channels, locks, channelKey: 'room1', tabId: 'B', sockets })
		await flushMicrotasks()
		const c = buildTab({ channels, locks, channelKey: 'room1', tabId: 'C', sockets })
		await flushMicrotasks()

		// Each tab's own TLSyncClient would start its clientClock at 0.
		a.sendMessage({ type: 'push', clientClock: 0 })
		b.sendMessage({ type: 'push', clientClock: 0 })
		c.sendMessage({ type: 'push', clientClock: 0 })

		const sent = sockets[0].sent.filter(
			(m): m is Extract<TLSocketClientSentEvent<TLRecord>, { type: 'push' }> =>
				m.type === 'push'
		)
		const clocks = sent.map((m) => m.clientClock)
		// All three got distinct remapped clocks.
		expect(new Set(clocks).size).toBe(3)

		a.close()
		b.close()
		c.close()
	})

	it('routes push_result back to the originating tab with its original clientClock', async () => {
		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()
		const b = buildTab({ channels, locks, channelKey: 'room1', tabId: 'B', sockets })
		await flushMicrotasks()

		const aReceived: TLSocketServerSentEvent<TLRecord>[] = []
		const bReceived: TLSocketServerSentEvent<TLRecord>[] = []
		a.onReceiveMessage((m) => aReceived.push(m))
		b.onReceiveMessage((m) => bReceived.push(m))

		// Both push at their own clientClock=0.
		a.sendMessage({ type: 'push', clientClock: 0 })
		b.sendMessage({ type: 'push', clientClock: 0 })

		const pushes = sockets[0].sent.filter(
			(m): m is Extract<TLSocketClientSentEvent<TLRecord>, { type: 'push' }> =>
				m.type === 'push'
		)
		expect(pushes).toHaveLength(2)
		const [aRemapped, bRemapped] = pushes.map((p) => p.clientClock)

		// Server responds out of order, with B's first then A's.
		sockets[0]._emitServerMessage({
			type: 'push_result',
			clientClock: bRemapped,
			serverClock: 1,
			action: 'commit',
		})
		sockets[0]._emitServerMessage({
			type: 'push_result',
			clientClock: aRemapped,
			serverClock: 2,
			action: 'commit',
		})

		// Each tab received exactly its own push_result with its own clientClock.
		expect(aReceived).toEqual([
			{ type: 'push_result', clientClock: 0, serverClock: 2, action: 'commit' },
		])
		expect(bReceived).toEqual([
			{ type: 'push_result', clientClock: 0, serverClock: 1, action: 'commit' },
		])

		a.close()
		b.close()
	})

	it('splits a mixed data batch between routed push_results and broadcast patches', async () => {
		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()
		const b = buildTab({ channels, locks, channelKey: 'room1', tabId: 'B', sockets })
		await flushMicrotasks()

		const aReceived: TLSocketServerSentEvent<TLRecord>[] = []
		const bReceived: TLSocketServerSentEvent<TLRecord>[] = []
		a.onReceiveMessage((m) => aReceived.push(m))
		b.onReceiveMessage((m) => bReceived.push(m))

		a.sendMessage({ type: 'push', clientClock: 0 })
		b.sendMessage({ type: 'push', clientClock: 0 })
		const pushes = sockets[0].sent.filter(
			(m): m is Extract<TLSocketClientSentEvent<TLRecord>, { type: 'push' }> =>
				m.type === 'push'
		)
		const [aRemapped, bRemapped] = pushes.map((p) => p.clientClock)

		sockets[0]._emitServerMessage({
			type: 'data',
			data: [
				{ type: 'push_result', clientClock: aRemapped, serverClock: 3, action: 'commit' },
				{ type: 'push_result', clientClock: bRemapped, serverClock: 4, action: 'commit' },
				{ type: 'patch', diff: {}, serverClock: 5 },
			],
		})

		// The broadcast patch reached both; each push_result only reached its
		// originator (with the original clientClock).
		function flatten(msgs: TLSocketServerSentEvent<TLRecord>[]) {
			return msgs.flatMap((m) => (m.type === 'data' ? m.data : [m]))
		}

		const aFlat = flatten(aReceived)
		const bFlat = flatten(bReceived)

		expect(aFlat).toEqual(
			expect.arrayContaining([
				{ type: 'push_result', clientClock: 0, serverClock: 3, action: 'commit' },
				{ type: 'patch', diff: {}, serverClock: 5 },
			])
		)
		expect(aFlat).not.toContainEqual(
			expect.objectContaining({ type: 'push_result', serverClock: 4 })
		)
		expect(bFlat).toEqual(
			expect.arrayContaining([
				{ type: 'push_result', clientClock: 0, serverClock: 4, action: 'commit' },
				{ type: 'patch', diff: {}, serverClock: 5 },
			])
		)
		expect(bFlat).not.toContainEqual(
			expect.objectContaining({ type: 'push_result', serverClock: 3 })
		)

		a.close()
		b.close()
	})

	it('routes connect responses back via connectRequestId', async () => {
		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()
		const b = buildTab({ channels, locks, channelKey: 'room1', tabId: 'B', sockets })
		await flushMicrotasks()

		const aReceived: TLSocketServerSentEvent<TLRecord>[] = []
		const bReceived: TLSocketServerSentEvent<TLRecord>[] = []
		a.onReceiveMessage((m) => aReceived.push(m))
		b.onReceiveMessage((m) => bReceived.push(m))

		b.sendMessage({
			type: 'connect',
			connectRequestId: 'cr-B',
			lastServerClock: 0,
			protocolVersion: 1,
			schema: { schemaVersion: 2, sequences: {} } as any,
		})

		sockets[0]._emitServerMessage({
			type: 'connect',
			connectRequestId: 'cr-B',
			hydrationType: 'wipe_all',
			protocolVersion: 1,
			schema: { schemaVersion: 2, sequences: {} } as any,
			diff: {},
			serverClock: 1,
			isReadonly: false,
		})

		expect(aReceived).toHaveLength(0)
		expect(bReceived).toHaveLength(1)
		expect(bReceived[0]).toMatchObject({ type: 'connect', connectRequestId: 'cr-B' })

		a.close()
		b.close()
	})

	it('broadcasts pong / patch messages to every tab', async () => {
		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()
		const b = buildTab({ channels, locks, channelKey: 'room1', tabId: 'B', sockets })
		await flushMicrotasks()

		const aReceived: TLSocketServerSentEvent<TLRecord>[] = []
		const bReceived: TLSocketServerSentEvent<TLRecord>[] = []
		a.onReceiveMessage((m) => aReceived.push(m))
		b.onReceiveMessage((m) => bReceived.push(m))

		sockets[0]._emitServerMessage({ type: 'pong' })
		sockets[0]._emitServerMessage({ type: 'patch', diff: {}, serverClock: 1 })

		expect(aReceived).toEqual([
			{ type: 'pong' },
			{ type: 'patch', diff: {}, serverClock: 1 },
		])
		expect(bReceived).toEqual([
			{ type: 'pong' },
			{ type: 'patch', diff: {}, serverClock: 1 },
		])

		a.close()
		b.close()
	})
})

describe('createLeaderRouter: sibling-patch synthesis', () => {
	let channels: ReturnType<typeof createMockChannelFactory>
	let locks: CrossTabLockManager
	let sockets: FakeSocket[]

	beforeEach(() => {
		channels = createMockChannelFactory()
		locks = createMockLockManager()
		sockets = []
	})

	// A small fake diff shaped like NetworkDiff. The structure isn't validated
	// by CrossTabSocket — it's opaque payload — so any plausible record op
	// suffices for these tests.
	const fakeDiff = {
		'shape:abc': ['put', { id: 'shape:abc', type: 'geo', x: 10, y: 20 }],
	} as any
	const rebasedDiff = {
		'shape:abc': ['put', { id: 'shape:abc', type: 'geo', x: 11, y: 22 }],
	} as any

	function sentPushes(socket: FakeSocket) {
		return socket.sent.filter(
			(m): m is Extract<TLSocketClientSentEvent<TLRecord>, { type: 'push' }> => m.type === 'push'
		)
	}

	it("on commit, other tabs receive a synthesized patch with the originator's diff", async () => {
		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()
		const b = buildTab({ channels, locks, channelKey: 'room1', tabId: 'B', sockets })
		await flushMicrotasks()
		const c = buildTab({ channels, locks, channelKey: 'room1', tabId: 'C', sockets })
		await flushMicrotasks()

		const aReceived: TLSocketServerSentEvent<TLRecord>[] = []
		const bReceived: TLSocketServerSentEvent<TLRecord>[] = []
		const cReceived: TLSocketServerSentEvent<TLRecord>[] = []
		a.onReceiveMessage((m) => aReceived.push(m))
		b.onReceiveMessage((m) => bReceived.push(m))
		c.onReceiveMessage((m) => cReceived.push(m))

		// B pushes a change.
		b.sendMessage({ type: 'push', clientClock: 0, diff: fakeDiff })
		const [bPush] = sentPushes(sockets[0])

		// Server commits.
		sockets[0]._emitServerMessage({
			type: 'push_result',
			clientClock: bPush.clientClock,
			serverClock: 1,
			action: 'commit',
		})

		// B gets the routed push_result with its own original clientClock.
		expect(bReceived).toEqual([
			{ type: 'push_result', clientClock: 0, serverClock: 1, action: 'commit' },
		])
		// A (leader's local TLSyncClient) and C get a synthesized patch with B's diff.
		expect(aReceived).toEqual([{ type: 'patch', diff: fakeDiff, serverClock: 1 }])
		expect(cReceived).toEqual([{ type: 'patch', diff: fakeDiff, serverClock: 1 }])

		a.close()
		b.close()
		c.close()
	})

	it("on commit, the leader's own push produces a synthesized patch for followers", async () => {
		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()
		const b = buildTab({ channels, locks, channelKey: 'room1', tabId: 'B', sockets })
		await flushMicrotasks()

		const aReceived: TLSocketServerSentEvent<TLRecord>[] = []
		const bReceived: TLSocketServerSentEvent<TLRecord>[] = []
		a.onReceiveMessage((m) => aReceived.push(m))
		b.onReceiveMessage((m) => bReceived.push(m))

		a.sendMessage({ type: 'push', clientClock: 0, diff: fakeDiff })
		const [aPush] = sentPushes(sockets[0])

		sockets[0]._emitServerMessage({
			type: 'push_result',
			clientClock: aPush.clientClock,
			serverClock: 1,
			action: 'commit',
		})

		// A is the originator: only gets the routed push_result, no patch.
		expect(aReceived).toEqual([
			{ type: 'push_result', clientClock: 0, serverClock: 1, action: 'commit' },
		])
		// B receives the synthesized patch.
		expect(bReceived).toEqual([{ type: 'patch', diff: fakeDiff, serverClock: 1 }])

		a.close()
		b.close()
	})

	it('uses rebaseWithDiff for siblings when the server rebases', async () => {
		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()
		const b = buildTab({ channels, locks, channelKey: 'room1', tabId: 'B', sockets })
		await flushMicrotasks()

		const aReceived: TLSocketServerSentEvent<TLRecord>[] = []
		const bReceived: TLSocketServerSentEvent<TLRecord>[] = []
		a.onReceiveMessage((m) => aReceived.push(m))
		b.onReceiveMessage((m) => bReceived.push(m))

		b.sendMessage({ type: 'push', clientClock: 0, diff: fakeDiff })
		const [bPush] = sentPushes(sockets[0])

		sockets[0]._emitServerMessage({
			type: 'push_result',
			clientClock: bPush.clientClock,
			serverClock: 7,
			action: { rebaseWithDiff: rebasedDiff },
		})

		expect(bReceived).toEqual([
			{
				type: 'push_result',
				clientClock: 0,
				serverClock: 7,
				action: { rebaseWithDiff: rebasedDiff },
			},
		])
		// Siblings get the server's rebased version, not the original.
		expect(aReceived).toEqual([{ type: 'patch', diff: rebasedDiff, serverClock: 7 }])

		a.close()
		b.close()
	})

	it('does not synthesize a patch when the server discards a push', async () => {
		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()
		const b = buildTab({ channels, locks, channelKey: 'room1', tabId: 'B', sockets })
		await flushMicrotasks()

		const aReceived: TLSocketServerSentEvent<TLRecord>[] = []
		const bReceived: TLSocketServerSentEvent<TLRecord>[] = []
		a.onReceiveMessage((m) => aReceived.push(m))
		b.onReceiveMessage((m) => bReceived.push(m))

		b.sendMessage({ type: 'push', clientClock: 0, diff: fakeDiff })
		const [bPush] = sentPushes(sockets[0])

		sockets[0]._emitServerMessage({
			type: 'push_result',
			clientClock: bPush.clientClock,
			serverClock: 2,
			action: 'discard',
		})

		// Originator still hears the discard; siblings hear nothing.
		expect(bReceived).toEqual([
			{ type: 'push_result', clientClock: 0, serverClock: 2, action: 'discard' },
		])
		expect(aReceived).toEqual([])

		a.close()
		b.close()
	})

	it('does not synthesize a patch when the original push had no diff (presence-only)', async () => {
		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()
		const b = buildTab({ channels, locks, channelKey: 'room1', tabId: 'B', sockets })
		await flushMicrotasks()

		const aReceived: TLSocketServerSentEvent<TLRecord>[] = []
		b.onReceiveMessage(() => {})
		a.onReceiveMessage((m) => aReceived.push(m))

		// Push with no diff field at all (a presence-only update).
		b.sendMessage({ type: 'push', clientClock: 0 })
		const [bPush] = sentPushes(sockets[0])

		sockets[0]._emitServerMessage({
			type: 'push_result',
			clientClock: bPush.clientClock,
			serverClock: 3,
			action: 'commit',
		})

		expect(aReceived).toEqual([])

		a.close()
		b.close()
	})

	it('synthesizes patches alongside broadcast patches inside a data batch', async () => {
		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()
		const b = buildTab({ channels, locks, channelKey: 'room1', tabId: 'B', sockets })
		await flushMicrotasks()
		const c = buildTab({ channels, locks, channelKey: 'room1', tabId: 'C', sockets })
		await flushMicrotasks()

		const aReceived: TLSocketServerSentEvent<TLRecord>[] = []
		const bReceived: TLSocketServerSentEvent<TLRecord>[] = []
		const cReceived: TLSocketServerSentEvent<TLRecord>[] = []
		a.onReceiveMessage((m) => aReceived.push(m))
		b.onReceiveMessage((m) => bReceived.push(m))
		c.onReceiveMessage((m) => cReceived.push(m))

		b.sendMessage({ type: 'push', clientClock: 0, diff: fakeDiff })
		c.sendMessage({ type: 'push', clientClock: 0, diff: rebasedDiff })
		const pushes = sentPushes(sockets[0])
		const [bPush, cPush] = pushes

		// A batch with: a broadcast patch (from another user), B's commit, C's
		// discard. We expect synthesis only for B's push.
		const externalPatch = {
			type: 'patch' as const,
			diff: { 'shape:xyz': ['remove'] } as any,
			serverClock: 9,
		}
		sockets[0]._emitServerMessage({
			type: 'data',
			data: [
				externalPatch,
				{
					type: 'push_result',
					clientClock: bPush.clientClock,
					serverClock: 10,
					action: 'commit',
				},
				{
					type: 'push_result',
					clientClock: cPush.clientClock,
					serverClock: 11,
					action: 'discard',
				},
			],
		})

		function flatten(msgs: TLSocketServerSentEvent<TLRecord>[]) {
			return msgs.flatMap((m) => (m.type === 'data' ? m.data : [m]))
		}

		const aFlat = flatten(aReceived)
		const bFlat = flatten(bReceived)
		const cFlat = flatten(cReceived)

		// Everyone gets the external patch.
		expect(aFlat).toContainEqual(externalPatch)
		expect(bFlat).toContainEqual(externalPatch)
		expect(cFlat).toContainEqual(externalPatch)

		// B's commit is routed back only to B.
		expect(bFlat).toContainEqual({
			type: 'push_result',
			clientClock: 0,
			serverClock: 10,
			action: 'commit',
		})
		expect(aFlat).not.toContainEqual(
			expect.objectContaining({ type: 'push_result', serverClock: 10 })
		)

		// C's discard is routed back only to C.
		expect(cFlat).toContainEqual({
			type: 'push_result',
			clientClock: 0,
			serverClock: 11,
			action: 'discard',
		})

		// A and C see B's synthesized patch (B's commit produced it). B doesn't.
		const synthPatch = { type: 'patch', diff: fakeDiff, serverClock: 10 }
		expect(aFlat).toContainEqual(synthPatch)
		expect(cFlat).toContainEqual(synthPatch)
		expect(bFlat).not.toContainEqual(synthPatch)

		// No synthesis from C's discard.
		expect(aFlat).not.toContainEqual(
			expect.objectContaining({ type: 'patch', diff: rebasedDiff })
		)

		a.close()
		b.close()
		c.close()
	})
})

describe('createLeaderRouter: status propagation', () => {
	let channels: ReturnType<typeof createMockChannelFactory>
	let locks: CrossTabLockManager
	let sockets: FakeSocket[]

	beforeEach(() => {
		channels = createMockChannelFactory()
		locks = createMockLockManager()
		sockets = []
	})

	it("followers mirror the leader's WS status", async () => {
		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()
		const b = buildTab({ channels, locks, channelKey: 'room1', tabId: 'B', sockets })
		await flushMicrotasks()

		const bStatuses: TLPersistentClientSocketStatus[] = []
		b.onStatusChange((ev) => bStatuses.push(ev.status))

		sockets[0]._emitStatus({ status: 'online' })
		// Followers see the change.
		expect(b.connectionStatus).toBe('online')
		expect(bStatuses).toEqual(['online'])

		sockets[0]._emitStatus({ status: 'offline' })
		expect(b.connectionStatus).toBe('offline')
		expect(bStatuses).toEqual(['online', 'offline'])

		a.close()
		b.close()
	})

	it('a follower that joins after the leader is online picks up status promptly', async () => {
		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()
		sockets[0]._emitStatus({ status: 'online' })

		// B joins late.
		const b = buildTab({ channels, locks, channelKey: 'room1', tabId: 'B', sockets })
		await flushMicrotasks()

		expect(b.connectionStatus).toBe('online')
		a.close()
		b.close()
	})
})

