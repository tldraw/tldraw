import { describe, expect, it, vi } from 'vitest'
import { createLoadTracker, type LoadTrackerDeps } from './loadTracker'

const STEPS = ['a', 'b', 'c'] as const
type S = (typeof STEPS)[number]

function setup(t0: number) {
	let t = t0
	const deps: LoadTrackerDeps<S> = { now: () => t, mark: vi.fn(), measure: vi.fn(), log: vi.fn() }
	const tracker = createLoadTracker(deps, {
		steps: STEPS,
		t0,
		loadId: 'V1StGXR8_Z5jdHi6B-myT',
		logPrefix: 'file-load',
		logHeader: 'header',
		markPrefix: 'tla-file',
	})
	return { deps, tracker, advance: (ms: number) => (t += ms) }
}

describe('createLoadTracker', () => {
	it('reports times relative to t0 but measures on the absolute timeline', () => {
		const { deps, tracker, advance } = setup(5000)
		advance(40)
		tracker.mark('a')
		advance(60)
		tracker.mark('c')
		expect(tracker.buildReport()).toMatchObject({
			load_id: 'V1StGXR8_Z5jdHi6B-myT',
			t_a: 40,
			t_c: 100,
			d_c: 60,
			total_ms: 100,
		})
		expect(deps.measure).toHaveBeenNthCalledWith(1, 'a', 5000, 5040)
		expect(deps.measure).toHaveBeenNthCalledWith(2, 'c', 5040, 5100)
		expect(deps.mark).toHaveBeenCalledWith('tla-file:a')
	})

	it('logs with its own prefix', () => {
		const { deps, tracker, advance } = setup(0)
		tracker.enableLiveLog()
		advance(10)
		tracker.mark('b')
		expect(deps.log).toHaveBeenLastCalledWith('[file-load] b +10ms (+10)')
	})

	it('says whether it has reported', () => {
		const { tracker } = setup(0)
		expect(tracker.isReported()).toBe(false)
		tracker.takeReport()
		expect(tracker.isReported()).toBe(true)
	})
})
