import { TLRecord } from '@tldraw/tlschema'
import { describe, expect, it, vi } from 'vitest'
import { TLSocketServerSentEvent } from '../protocol'
import { createPushRouting } from './createPushRouting'
import { routeServerMessage, ServerMessageDispatch, synthesizePatchForSiblings } from './routeServerMessage'

const fakeDiff = {
	'shape:abc': ['put', { id: 'shape:abc', type: 'geo' }],
} as any
const rebasedDiff = {
	'shape:abc': ['put', { id: 'shape:abc', type: 'geo', x: 1 }],
} as any

function spyDispatch(): ServerMessageDispatch & {
	all: ReturnType<typeof vi.fn>
	one: ReturnType<typeof vi.fn>
	except: ReturnType<typeof vi.fn>
} {
	const all = vi.fn()
	const one = vi.fn()
	const except = vi.fn()
	return {
		toAll: all,
		to: one,
		toAllExcept: except,
		all,
		one,
		except,
	}
}

describe('synthesizePatchForSiblings', () => {
	const route = { fromTabId: 'B', originalClock: 0, originalDiff: fakeDiff }

	it('returns a patch with the original diff on commit', () => {
		const result = synthesizePatchForSiblings(
			{ type: 'push_result', clientClock: 5, serverClock: 1, action: 'commit' },
			route
		)
		expect(result).toEqual({ type: 'patch', diff: fakeDiff, serverClock: 1 })
	})

	it('returns a patch with the rebased diff on rebaseWithDiff', () => {
		const result = synthesizePatchForSiblings(
			{
				type: 'push_result',
				clientClock: 5,
				serverClock: 2,
				action: { rebaseWithDiff: rebasedDiff },
			},
			route
		)
		expect(result).toEqual({ type: 'patch', diff: rebasedDiff, serverClock: 2 })
	})

	it('returns null on discard', () => {
		const result = synthesizePatchForSiblings(
			{ type: 'push_result', clientClock: 5, serverClock: 3, action: 'discard' },
			route
		)
		expect(result).toBeNull()
	})

	it('returns null when the original push had no diff (presence-only)', () => {
		const result = synthesizePatchForSiblings(
			{ type: 'push_result', clientClock: 5, serverClock: 4, action: 'commit' },
			{ fromTabId: 'B', originalClock: 0 }
		)
		expect(result).toBeNull()
	})

	it('returns null when the diff is empty', () => {
		const result = synthesizePatchForSiblings(
			{ type: 'push_result', clientClock: 5, serverClock: 5, action: 'commit' },
			{ fromTabId: 'B', originalClock: 0, originalDiff: {} as any }
		)
		expect(result).toBeNull()
	})
})

describe('routeServerMessage', () => {
	it('broadcasts pong and other non-routed messages', () => {
		const routing = createPushRouting()
		const d = spyDispatch()

		routeServerMessage({ type: 'pong' }, routing, d)
		expect(d.all).toHaveBeenCalledWith({ type: 'pong' })
		expect(d.one).not.toHaveBeenCalled()
		expect(d.except).not.toHaveBeenCalled()
	})

	it('routes connect responses by connectRequestId, broadcasts if unknown', () => {
		const routing = createPushRouting()
		routing.registerConnect('cr-A', 'A')
		const d = spyDispatch()

		const known = {
			type: 'connect' as const,
			connectRequestId: 'cr-A',
			hydrationType: 'wipe_all' as const,
			protocolVersion: 1,
			schema: {} as any,
			diff: {},
			serverClock: 1,
			isReadonly: false,
		}
		routeServerMessage(known, routing, d)
		expect(d.one).toHaveBeenCalledWith('A', known)
		expect(d.all).not.toHaveBeenCalled()

		// Unknown id → safe broadcast
		const unknown = { ...known, connectRequestId: 'cr-unknown' }
		routeServerMessage(unknown, routing, d)
		expect(d.all).toHaveBeenCalledWith(unknown)
	})

	it('routes push_result back to originator and synthesizes a sibling patch on commit', () => {
		const routing = createPushRouting()
		const leaderClock = routing.registerPush({
			fromTabId: 'B',
			originalClock: 0,
			originalDiff: fakeDiff,
		})
		const d = spyDispatch()

		routeServerMessage(
			{ type: 'push_result', clientClock: leaderClock, serverClock: 1, action: 'commit' },
			routing,
			d
		)

		expect(d.one).toHaveBeenCalledWith('B', {
			type: 'push_result',
			clientClock: 0,
			serverClock: 1,
			action: 'commit',
		})
		expect(d.except).toHaveBeenCalledWith('B', {
			type: 'patch',
			diff: fakeDiff,
			serverClock: 1,
		})
	})

	it('drops push_result with no matching routing entry (stale handoff)', () => {
		const routing = createPushRouting()
		const d = spyDispatch()

		routeServerMessage(
			{ type: 'push_result', clientClock: 999, serverClock: 1, action: 'commit' },
			routing,
			d
		)

		expect(d.all).not.toHaveBeenCalled()
		expect(d.one).not.toHaveBeenCalled()
		expect(d.except).not.toHaveBeenCalled()
	})

	it('splits a data batch: patches broadcast, push_results routed, sibling synthesis fanned out', () => {
		const routing = createPushRouting()
		const bClock = routing.registerPush({
			fromTabId: 'B',
			originalClock: 0,
			originalDiff: fakeDiff,
		})
		const cClock = routing.registerPush({ fromTabId: 'C', originalClock: 0 })
		const d = spyDispatch()

		const externalPatch = {
			type: 'patch' as const,
			diff: {} as any,
			serverClock: 9,
		}
		routeServerMessage(
			{
				type: 'data',
				data: [
					externalPatch,
					{ type: 'push_result', clientClock: bClock, serverClock: 10, action: 'commit' },
					{ type: 'push_result', clientClock: cClock, serverClock: 11, action: 'discard' },
				],
			},
			routing,
			d
		)

		// External patch is broadcast.
		expect(d.all).toHaveBeenCalledWith({ type: 'data', data: [externalPatch] })

		// B's push_result routed to B with original clientClock.
		expect(d.one).toHaveBeenCalledWith('B', {
			type: 'data',
			data: [
				{ type: 'push_result', clientClock: 0, serverClock: 10, action: 'commit' },
			],
		})

		// C's push_result routed to C; C's was a discard, no synthesis.
		expect(d.one).toHaveBeenCalledWith('C', {
			type: 'data',
			data: [
				{ type: 'push_result', clientClock: 0, serverClock: 11, action: 'discard' },
			],
		})

		// B's commit synthesizes a patch for everyone except B.
		expect(d.except).toHaveBeenCalledWith('B', {
			type: 'patch',
			diff: fakeDiff,
			serverClock: 10,
		})

		// C's discard does not synthesize anything.
		const exceptCalls = d.except.mock.calls
		expect(exceptCalls.filter(([tabId]) => tabId === 'C')).toHaveLength(0)
	})

	it('drops a data batch with only stale push_results', () => {
		const routing = createPushRouting()
		const d = spyDispatch()

		routeServerMessage(
			{
				type: 'data',
				data: [
					{ type: 'push_result', clientClock: 999, serverClock: 1, action: 'commit' },
				],
			},
			routing,
			d
		)

		// No broadcast (no inner broadcast events), no routes (no valid clocks).
		expect(d.all).not.toHaveBeenCalled()
		expect(d.one).not.toHaveBeenCalled()
		expect(d.except).not.toHaveBeenCalled()
	})
})
