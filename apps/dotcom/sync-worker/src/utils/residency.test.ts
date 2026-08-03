import { describe, expect, it } from 'vitest'
import { RESIDENT_GAP_THRESHOLD_MS, classifyResidency } from './residency'

const NOW = 1_700_000_000_000

function classify(overrides: Partial<Parameters<typeof classifyResidency>[0]> = {}) {
	return classifyResidency({ lastEventAt: null, now: NOW, socketCount: 0, ...overrides })
}

describe('classifyResidency', () => {
	describe('a freshly constructed instance', () => {
		// The constructor re-running with clients still attached is the signature of a hibernation
		// wake: the sockets stayed connected to the edge while the object was evicted.
		it('reports a wake when sockets are already attached', () => {
			expect(classify({ lastEventAt: null, socketCount: 3 })).toEqual({
				event: 'room_wake',
				socketCount: 3,
			})
		})

		it('reports a cold start when nothing is attached yet', () => {
			expect(classify({ lastEventAt: null, socketCount: 0 })).toEqual({
				event: 'room_cold_start',
				socketCount: 0,
			})
		})
	})

	describe('an instance that has seen an event before', () => {
		// In-memory state surviving the gap proves the object was never evicted, so it was billed
		// wall-clock for the whole idle stretch.
		it('reports the gap when in-memory state survived longer than the threshold', () => {
			expect(classify({ lastEventAt: NOW - 60_000 })).toEqual({
				event: 'room_resident_gap',
				gapMs: 60_000,
			})
		})

		it('says nothing about ordinary traffic', () => {
			expect(classify({ lastEventAt: NOW - 200 })).toBeNull()
		})

		it('says nothing at exactly the threshold, so the boundary is not double-counted', () => {
			expect(classify({ lastEventAt: NOW - RESIDENT_GAP_THRESHOLD_MS })).toBeNull()
			expect(classify({ lastEventAt: NOW - RESIDENT_GAP_THRESHOLD_MS - 1 })).toEqual({
				event: 'room_resident_gap',
				gapMs: RESIDENT_GAP_THRESHOLD_MS + 1,
			})
		})

		// Sockets are irrelevant once the instance has state: what matters is that the state survived.
		it('reports a gap regardless of how many sockets are attached', () => {
			expect(classify({ lastEventAt: NOW - 60_000, socketCount: 5 })).toEqual({
				event: 'room_resident_gap',
				gapMs: 60_000,
			})
		})
	})

	// The default sits above the 8s triggerPersist throttle, so a reported gap can't be explained by
	// the longest timer that legitimately holds the object awake.
	it('defaults its threshold above the longest legitimate timer', () => {
		expect(RESIDENT_GAP_THRESHOLD_MS).toBeGreaterThan(8_000)
	})

	it('accepts an explicit threshold, so an experiment can tighten it', () => {
		expect(classify({ lastEventAt: NOW - 2_000, thresholdMs: 1_000 })).toEqual({
			event: 'room_resident_gap',
			gapMs: 2_000,
		})
	})
})
