import { describe, expect, it } from 'vitest'
import { IDLE_TTL_MS, nextExpiryTime } from './shared/types'

const NOW = 1_700_000_000_000
const HOUR = 60 * 60_000

describe('nextExpiryTime', () => {
	it('backs off an hour when the check failed, even with no lastActivity to go on', () => {
		// The regression: `lastActivity ?? now` plus a 7-day TTL beat the hour
		// floor, so a storage error pushed the retry a full TTL out.
		expect(nextExpiryTime({ failed: true, lastActivity: null, now: NOW, ttlMs: IDLE_TTL_MS })).toBe(
			NOW + HOUR
		)
	})

	it('backs off an hour when the check failed but lastActivity is known', () => {
		expect(
			nextExpiryTime({ failed: true, lastActivity: NOW - 1000, now: NOW, ttlMs: IDLE_TTL_MS })
		).toBe(NOW + HOUR)
	})

	it('schedules a full TTL past the last activity on a healthy check', () => {
		expect(
			nextExpiryTime({ failed: false, lastActivity: NOW - 1000, now: NOW, ttlMs: IDLE_TTL_MS })
		).toBe(NOW - 1000 + IDLE_TTL_MS)
	})

	it('applies the 60s floor when lastActivity + ttl is already in the past', () => {
		expect(
			nextExpiryTime({
				failed: false,
				lastActivity: NOW - 2 * IDLE_TTL_MS,
				now: NOW,
				ttlMs: IDLE_TTL_MS,
			})
		).toBe(NOW + 60_000)
	})
})
