import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PerformanceTracker } from './PerformanceTracker'
import { PERFORMANCE_COLORS, PERFORMANCE_PREFIX_COLOR } from './perf'

describe('PerformanceTracker', () => {
	let tracker: PerformanceTracker
	let mockPerformanceNow: ReturnType<typeof vi.fn>
	let mockRequestAnimationFrame: ReturnType<typeof vi.fn>
	let mockCancelAnimationFrame: ReturnType<typeof vi.fn>
	let mockConsoleDebug: ReturnType<typeof vi.fn>
	let frameId = 1

	beforeEach(() => {
		tracker = new PerformanceTracker()

		// Mock performance.now
		mockPerformanceNow = vi.fn()
		vi.stubGlobal('performance', { now: mockPerformanceNow })

		// Mock requestAnimationFrame and cancelAnimationFrame
		mockRequestAnimationFrame = vi.fn().mockImplementation(() => frameId++)
		mockCancelAnimationFrame = vi.fn()
		vi.stubGlobal('requestAnimationFrame', mockRequestAnimationFrame)
		vi.stubGlobal('cancelAnimationFrame', mockCancelAnimationFrame)

		// Mock console.debug
		mockConsoleDebug = vi.fn()
		vi.spyOn(console, 'debug').mockImplementation(mockConsoleDebug)
	})

	afterEach(() => {
		vi.unstubAllGlobals()
		vi.restoreAllMocks()
		frameId = 1
	})

	it('tracks start/stop state correctly', () => {
		expect(tracker.isStarted()).toBe(false)

		mockPerformanceNow.mockReturnValue(100)
		tracker.start('test')
		expect(tracker.isStarted()).toBe(true)

		mockPerformanceNow.mockReturnValue(200)
		tracker.stop()
		expect(tracker.isStarted()).toBe(false)
	})

	it('calculates and logs FPS correctly', () => {
		// Setup: 1 second duration with 60 frames
		mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(1000)

		tracker.start('render')
		const recordFrame = mockRequestAnimationFrame.mock.calls[0][0]

		// Simulate 60 frames
		for (let i = 0; i < 60; i++) {
			recordFrame()
		}

		tracker.stop()

		expect(mockConsoleDebug).toHaveBeenCalledWith(
			'%cPerf%c Render %c60%c fps',
			`color: white; background: ${PERFORMANCE_PREFIX_COLOR};padding: 2px;border-radius: 3px;`,
			'font-weight: normal',
			`font-weight: bold; padding: 2px; background: ${PERFORMANCE_COLORS.Good};color: white;`,
			'font-weight: normal'
		)
	})

	it('resets frame count between tracking sessions', () => {
		mockPerformanceNow.mockReturnValueOnce(100).mockReturnValueOnce(200)

		// First session with frames
		tracker.start('test')
		const recordFrame = mockRequestAnimationFrame.mock.calls[0][0]
		recordFrame() // simulate frame
		recordFrame() // simulate frame
		tracker.stop()

		// Second session should reset frame count
		mockPerformanceNow.mockReturnValueOnce(300).mockReturnValueOnce(400)
		tracker.start('test2')
		tracker.stop()

		// Should show 0 fps for second session (0 frames in 0.1 seconds)
		expect(mockConsoleDebug).toHaveBeenLastCalledWith(
			'%cPerf%c Test2 %c0%c fps',
			expect.any(String),
			'font-weight: normal',
			expect.any(String),
			'font-weight: normal'
		)
	})

	it('records frames only while tracking is active', () => {
		mockPerformanceNow.mockReturnValue(100)

		tracker.start('test')
		const recordFrame = mockRequestAnimationFrame.mock.calls[0][0]

		tracker.stop()
		mockRequestAnimationFrame.mockClear()

		// Frame recording should stop after stop() is called
		recordFrame()
		expect(mockRequestAnimationFrame).not.toHaveBeenCalled()
	})

	it('handles zero duration gracefully', () => {
		// Zero duration should not crash
		mockPerformanceNow.mockReturnValue(100)
		tracker.start('instant')
		tracker.stop()
		expect(mockConsoleDebug).toHaveBeenCalledWith(
			'%cPerf%c Instant %c0%c fps',
			expect.any(String),
			'font-weight: normal',
			expect.any(String),
			'font-weight: normal'
		)
	})
})
