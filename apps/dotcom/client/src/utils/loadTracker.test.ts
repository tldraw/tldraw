import { describe, expect, it, vi } from 'vitest'
import {
	createLoadTracker,
	serverTables,
	shouldReportLoad,
	type LoadTrackerDeps,
} from './loadTracker'

const STEPS = ['a', 'b', 'c'] as const
type S = (typeof STEPS)[number]

function setup(t0: number) {
	let t = t0
	const deps: LoadTrackerDeps<S> = { now: () => t, mark: vi.fn(), measure: vi.fn(), log: vi.fn() }
	const tracker = createLoadTracker(deps, {
		steps: STEPS,
		t0,
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
			load_id: tracker.loadId,
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

describe('shouldReportLoad', () => {
	it('reports for tldraw.com accounts regardless of the flag', () => {
		expect(shouldReportLoad({ email: 'someone@tldraw.com', flagEnabled: false })).toBe(true)
	})
	it('reports for other accounts only when the flag is on for them', () => {
		expect(shouldReportLoad({ email: 'someone@example.com', flagEnabled: false })).toBe(false)
		expect(shouldReportLoad({ email: 'someone@example.com', flagEnabled: true })).toBe(true)
	})
	it('does not report anonymous loads unless the flag says so', () => {
		expect(shouldReportLoad({ email: null, flagEnabled: false })).toBe(false)
		expect(shouldReportLoad({ email: undefined, flagEnabled: false })).toBe(false)
	})
	it('is not fooled by a tldraw.com substring elsewhere in the address', () => {
		expect(shouldReportLoad({ email: 'tldraw.com@example.com', flagEnabled: false })).toBe(false)
	})
})

describe('serverTables', () => {
	const fields = {
		srv_cold: false,
		srv_d_auth: 1,
		srv_t_auth: 1,
		srv_d_handshake: 64,
		srv_t_handshake: 109,
		srv_d_group_check: 19,
		srv_t_group_check: 45,
		srv_echo: true,
	}

	it('lists server steps one row each, in the order they ran, like the client step table', () => {
		expect(serverTables(fields, false).steps).toEqual([
			{ step: 'auth', 'ms since connect start': 1, 'delta ms': 1 },
			{ step: 'group_check', 'ms since connect start': 45, 'delta ms': 19 },
			{ step: 'handshake', 'ms since connect start': 109, 'delta ms': 64 },
		])
	})

	it('keeps the fields that are not steps apart', () => {
		expect(serverTables(fields, false).other).toEqual({ srv_cold: false, srv_echo: true })
	})

	it('describes steps for staff, and names an unknown step instead of dropping it', () => {
		const { steps } = serverTables({ srv_d_warp: 5, srv_t_warp: 5 }, true)
		expect(steps).toEqual([{ step: 'warp', 'ms since connect start': 5, 'delta ms': 5, what: '' }])
		expect(serverTables(fields, true).steps[0]).toMatchObject({ what: 'verify the Clerk token' })
	})
})
