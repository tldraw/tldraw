import { describe, expect, it } from 'vitest'
import { createPushRouting } from './createPushRouting'

describe('createPushRouting', () => {
	it('allocates distinct monotonic leader clocks for each push', () => {
		const r = createPushRouting()
		const c1 = r.registerPush({ fromTabId: 'A', originalClock: 0 })
		const c2 = r.registerPush({ fromTabId: 'B', originalClock: 0 })
		const c3 = r.registerPush({ fromTabId: 'A', originalClock: 1 })
		expect(new Set([c1, c2, c3]).size).toBe(3)
		expect(c2).toBeGreaterThan(c1)
		expect(c3).toBeGreaterThan(c2)
	})

	it('returns the routing entry when consuming a known push clock', () => {
		const r = createPushRouting()
		const diff = { 'shape:abc': ['put', { id: 'shape:abc' }] } as any
		const leaderClock = r.registerPush({
			fromTabId: 'A',
			originalClock: 7,
			originalDiff: diff,
		})

		const consumed = r.consumePushResult(leaderClock)
		expect(consumed).toEqual({ fromTabId: 'A', originalClock: 7, originalDiff: diff })
	})

	it('consuming a push clock removes the entry (second consume returns null)', () => {
		const r = createPushRouting()
		const leaderClock = r.registerPush({ fromTabId: 'A', originalClock: 0 })

		expect(r.consumePushResult(leaderClock)).not.toBeNull()
		expect(r.consumePushResult(leaderClock)).toBeNull()
	})

	it('returns null for an unknown push clock', () => {
		const r = createPushRouting()
		expect(r.consumePushResult(999)).toBeNull()
	})

	it('routes connect responses by connectRequestId', () => {
		const r = createPushRouting()
		r.registerConnect('cr-1', 'A')
		r.registerConnect('cr-2', 'B')

		expect(r.consumeConnect('cr-1')).toBe('A')
		expect(r.consumeConnect('cr-2')).toBe('B')
	})

	it('consuming a connect removes the entry (second consume returns null)', () => {
		const r = createPushRouting()
		r.registerConnect('cr-1', 'A')

		expect(r.consumeConnect('cr-1')).toBe('A')
		expect(r.consumeConnect('cr-1')).toBeNull()
	})

	it('returns null for an unknown connectRequestId', () => {
		const r = createPushRouting()
		expect(r.consumeConnect('cr-unknown')).toBeNull()
	})

	it('clear() drops all push and connect entries', () => {
		const r = createPushRouting()
		const c = r.registerPush({ fromTabId: 'A', originalClock: 0 })
		r.registerConnect('cr-1', 'A')

		r.clear()

		expect(r.consumePushResult(c)).toBeNull()
		expect(r.consumeConnect('cr-1')).toBeNull()
	})
})
