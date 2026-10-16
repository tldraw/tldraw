import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FrameScheduler } from './frame'

// Not `requestAnimationFrame`: the dom setup owns that global and FrameScheduler.install replaces it.
const FAKED_TIMERS = [
	'setTimeout',
	'clearTimeout',
	'setImmediate',
	'clearImmediate',
	'setInterval',
	'clearInterval',
	'Date',
	'performance',
] as const

const FRAME_MS_60 = 1000 / 60

describe('FrameScheduler with fake timers', () => {
	let scheduler: FrameScheduler | null = null

	function create(opts: { maxFps?: number } = {}) {
		scheduler = new FrameScheduler({ now: () => Date.now(), ...opts })
		return scheduler
	}

	beforeEach(() => {
		vi.useFakeTimers({ toFake: [...FAKED_TIMERS] })
	})

	afterEach(() => {
		scheduler?.dispose()
		scheduler = null
		vi.useRealTimers()
	})

	it('runs the first requested frame on the next immediate', () => {
		const s = create()
		const cb = vi.fn()
		s.requestFrame(cb)
		expect(cb).not.toHaveBeenCalled()
		expect(s.getStats().parked).toBe(false)
		vi.advanceTimersByTime(0)
		expect(cb).toHaveBeenCalledTimes(1)
		expect(cb).toHaveBeenCalledWith(Date.now())
		expect(s.getStats().frames).toBe(1)
	})

	it('spaces frames at least 1000/maxFps apart while kept alive', () => {
		const s = create({ maxFps: 60 })
		s.setKeepAlive(() => true)
		const starts: number[] = []
		const loop = (t: number) => {
			starts.push(t)
			s.requestFrame(loop)
		}
		s.requestFrame(loop)
		vi.advanceTimersByTime(1000)
		expect(starts.length).toBeGreaterThanOrEqual(55)
		expect(starts.length).toBeLessThanOrEqual(61)
		for (let i = 1; i < starts.length; i++) {
			expect(starts[i] - starts[i - 1]).toBeGreaterThanOrEqual(FRAME_MS_60 - 1e-9)
		}
		expect(s.getStats().parked).toBe(false)
	})

	it('clamps maxFps to [30, 120]', () => {
		const fast = create({ maxFps: 1000 })
		fast.setKeepAlive(() => true)
		const fastStarts: number[] = []
		const fastLoop = (t: number) => {
			fastStarts.push(t)
			fast.requestFrame(fastLoop)
		}
		fast.requestFrame(fastLoop)
		vi.advanceTimersByTime(1000)
		for (let i = 1; i < fastStarts.length; i++) {
			expect(fastStarts[i] - fastStarts[i - 1]).toBeGreaterThanOrEqual(1000 / 120 - 1e-9)
		}
		expect(fastStarts.length).toBeGreaterThanOrEqual(100)
		expect(fastStarts.length).toBeLessThanOrEqual(121)
		fast.dispose()

		const slow = create({ maxFps: 10 })
		slow.setKeepAlive(() => true)
		const slowStarts: number[] = []
		const slowLoop = (t: number) => {
			slowStarts.push(t)
			slow.requestFrame(slowLoop)
		}
		slow.requestFrame(slowLoop)
		vi.advanceTimersByTime(1000)
		// 30 fps, not 10: 1000/33.3 frames rather than 10.
		expect(slowStarts.length).toBeGreaterThanOrEqual(25)
		expect(slowStarts.length).toBeLessThanOrEqual(31)
	})

	it('parks after two idle frames and holds the queued callback until kick()', () => {
		const s = create()
		let calls = 0
		const loop = () => {
			calls++
			s.requestFrame(loop)
		}
		s.requestFrame(loop)
		vi.advanceTimersByTime(1000)
		// No keepAlive: frame 1 is idle once, frame 2 twice, then nothing is scheduled.
		expect(calls).toBe(2)
		expect(s.getStats().parked).toBe(true)
		expect(s.getPendingFrameCount()).toBe(1)

		vi.advanceTimersByTime(5000)
		expect(calls).toBe(2)

		s.kick()
		expect(s.getStats().parked).toBe(false)
		vi.advanceTimersByTime(0)
		expect(calls).toBe(3)
		// The kick reset the idle count, so two more idle frames run before parking again.
		vi.advanceTimersByTime(1000)
		expect(calls).toBe(4)
		expect(s.getStats().parked).toBe(true)
	})

	it('keeps running while keepAlive is true and parks two frames after it turns false', () => {
		const s = create({ maxFps: 60 })
		let alive = true
		s.setKeepAlive(() => alive)
		let calls = 0
		const loop = () => {
			calls++
			s.requestFrame(loop)
		}
		s.requestFrame(loop)
		vi.advanceTimersByTime(500)
		const afterHalfSecond = calls
		expect(afterHalfSecond).toBeGreaterThan(20)
		expect(s.getStats().parked).toBe(false)

		alive = false
		vi.advanceTimersByTime(500)
		expect(calls).toBe(afterHalfSecond + 2)
		expect(s.getStats().parked).toBe(true)
	})

	it('resumes a parked loop when a new frame is requested', () => {
		const s = create()
		const first = vi.fn()
		s.requestFrame(first)
		vi.advanceTimersByTime(100)
		expect(first).toHaveBeenCalledTimes(1)
		expect(s.getStats().parked).toBe(true)

		const second = vi.fn()
		s.requestFrame(second)
		expect(s.getStats().parked).toBe(false)
		vi.advanceTimersByTime(0)
		expect(second).toHaveBeenCalledTimes(1)
	})

	it('runs callbacks requested during a frame in the next frame', () => {
		const s = create()
		s.setKeepAlive(() => true)
		const order: string[] = []
		s.onAfterFrame(() => order.push('after'))
		s.requestFrame(() => {
			order.push('a')
			s.requestFrame(() => order.push('b'))
		})
		vi.advanceTimersByTime(0)
		expect(order).toEqual(['a', 'after'])
		vi.advanceTimersByTime(FRAME_MS_60 + 2)
		expect(order).toEqual(['a', 'after', 'b', 'after'])
	})

	it('cancelFrame drops a queued callback', () => {
		const s = create()
		const kept = vi.fn()
		const dropped = vi.fn()
		s.requestFrame(kept)
		const id = s.requestFrame(dropped)
		s.cancelFrame(id)
		expect(s.getPendingFrameCount()).toBe(1)
		vi.advanceTimersByTime(0)
		expect(kept).toHaveBeenCalledTimes(1)
		expect(dropped).not.toHaveBeenCalled()
	})

	it('onAfterFrame reports the frame start and whether callbacks ran; unsubscribing stops it', () => {
		const s = create()
		const infos: { frameStart: number; ticked: boolean }[] = []
		const off = s.onAfterFrame((info) => infos.push({ ...info }))
		s.requestFrame(() => {})
		vi.advanceTimersByTime(0)
		expect(infos).toEqual([{ frameStart: Date.now(), ticked: true }])
		// The second (empty) frame runs because one idle frame is not enough to park.
		vi.advanceTimersByTime(100)
		expect(infos).toHaveLength(2)
		expect(infos[1].ticked).toBe(false)
		expect(infos[1].frameStart).toBeGreaterThanOrEqual(infos[0].frameStart + FRAME_MS_60)
		expect(s.getStats().parked).toBe(true)

		off()
		s.kick()
		vi.advanceTimersByTime(100)
		expect(infos).toHaveLength(2)
		expect(s.getStats().frames).toBeGreaterThan(2)
	})

	it('kick() inside a frame keeps the loop alive for another frame instead of re-entering', () => {
		const s = create()
		let depth = 0
		let maxDepth = 0
		s.requestFrame(() => {
			depth++
			maxDepth = Math.max(maxDepth, depth)
			s.kick()
			depth--
		})
		vi.advanceTimersByTime(0)
		expect(maxDepth).toBe(1)
		expect(s.getStats().frames).toBe(1)
		expect(s.getStats().parked).toBe(false)
		// Frame 2 is the kicked frame (idle 1), frame 3 is idle 2 → park.
		vi.advanceTimersByTime(200)
		expect(s.getStats().frames).toBe(3)
		expect(s.getStats().parked).toBe(true)
	})

	it('kick() while a frame is already scheduled does not add a frame', () => {
		const s = create()
		s.requestFrame(() => {})
		s.kick()
		s.kick()
		vi.advanceTimersByTime(0)
		expect(s.getStats().frames).toBe(1)
	})

	it('surfaces a throwing callback after scheduling the next frame', () => {
		const s = create()
		s.setKeepAlive(() => true)
		const after = vi.fn()
		s.onAfterFrame(after)
		s.requestFrame(() => {
			throw new Error('boom')
		})
		expect(() => vi.advanceTimersByTime(0)).toThrow('boom')
		expect(after).toHaveBeenCalledTimes(1)
		expect(s.getStats().parked).toBe(false)
		vi.advanceTimersByTime(FRAME_MS_60 + 2)
		expect(s.getStats().frames).toBe(2)
	})

	it('install() backs requestAnimationFrame on globalThis and the window; dispose() restores them', () => {
		const s = create()
		const previousRequest = globalThis.requestAnimationFrame
		const previousCancel = globalThis.cancelAnimationFrame
		const fakeWindow = {} as Window & {
			requestAnimationFrame?: unknown
			cancelAnimationFrame?: unknown
		}
		s.install(fakeWindow)
		expect(globalThis.requestAnimationFrame).not.toBe(previousRequest)
		expect(fakeWindow.requestAnimationFrame).toBe(globalThis.requestAnimationFrame)
		expect(fakeWindow.cancelAnimationFrame).toBe(globalThis.cancelAnimationFrame)

		const ran = vi.fn()
		const cancelled = vi.fn()
		globalThis.requestAnimationFrame(ran)
		globalThis.cancelAnimationFrame(fakeWindow.requestAnimationFrame(cancelled))
		vi.advanceTimersByTime(0)
		expect(ran).toHaveBeenCalledTimes(1)
		expect(cancelled).not.toHaveBeenCalled()
		expect(s.getStats().frames).toBe(1)

		s.dispose()
		expect(globalThis.requestAnimationFrame).toBe(previousRequest)
		expect(globalThis.cancelAnimationFrame).toBe(previousCancel)
		expect(fakeWindow.requestAnimationFrame).toBeUndefined()
	})

	it('dispose() cancels the pending frame and ignores later requests and kicks', () => {
		const s = create()
		const cb = vi.fn()
		s.requestFrame(cb)
		s.dispose()
		vi.advanceTimersByTime(100)
		expect(cb).not.toHaveBeenCalled()
		s.requestFrame(cb)
		s.kick()
		vi.advanceTimersByTime(100)
		expect(cb).not.toHaveBeenCalled()
		expect(s.getStats()).toEqual({ frames: 0, lastFrameMs: 0, parked: true })
	})

	it('getStats counts frames and measures the last frame', () => {
		const s = create()
		s.requestFrame(() => {
			vi.advanceTimersByTime(3)
		})
		vi.advanceTimersByTime(0)
		expect(s.getStats().frames).toBe(1)
		expect(s.getStats().lastFrameMs).toBe(3)
	})
})

describe('FrameScheduler with real timers', () => {
	it('kick() from a parked loop produces a frame within 10 ms', async () => {
		const s = new FrameScheduler()
		try {
			const t0 = performance.now()
			const elapsed = new Promise<number>((resolve) => {
				s.onAfterFrame(() => resolve(performance.now() - t0))
			})
			s.kick()
			expect(await elapsed).toBeLessThan(10)
			expect(s.getStats().frames).toBe(1)
		} finally {
			s.dispose()
		}
	})
})
