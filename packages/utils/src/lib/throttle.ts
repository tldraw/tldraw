const isTest = () =>
	typeof process !== 'undefined' &&
	process.env.NODE_ENV === 'test' &&
	// @ts-expect-error
	!globalThis.__FORCE_RAF_IN_TESTS__

// Ordered queue for items that should maintain FIFO order (default adaptive FPS)
const orderedQueue: Array<() => void> = []

// Unordered queue for items with custom timing that can execute out of order
interface TimingBasedItem {
	fn(): void
	getTargetFps(): number
	lastRunTime: number
}
const timingBasedQueue: Array<TimingBasedItem> = []

// Adaptive FPS system
const MIN_FPS = 30
const MAX_FPS = 120
const DEFAULT_FPS = 60

// e.g. ~15ms for 60 - we allow for some variance as browsers aren't that precise.
// However, for 120 fps we want to unlock the full 120fps, so we set fix it at that.
const getTargetTimePerFrame = (fps: number) => Math.floor(1000 / fps) * (fps >= 120 ? 1 : 0.9)

let targetFps = DEFAULT_FPS
let targetTimePerFrame = getTargetTimePerFrame(targetFps)
let lastFlushTime = -targetTimePerFrame
let frameRaf: undefined | number

// Performance monitoring - tracks maximum detected FPS (device's natural refresh rate)
const FPS_MEASUREMENT_WINDOW = 250
let fpsCheckHistory: number[] = []
let framesInCurrentWindow = 0
let windowStartTime = 0
let maxDetectedFps = DEFAULT_FPS // Track the highest FPS we've measured
let isManuallySet = false // Track if user has manually set the FPS

const updateTargetFps = () => {
	if (fpsCheckHistory.length < 3) return // Need at least 3 measurements

	const avgFps = fpsCheckHistory.reduce((a, b) => a + b, 0) / fpsCheckHistory.length

	// Track the maximum FPS we've detected (likely the device's natural refresh rate)
	if (avgFps > maxDetectedFps) {
		maxDetectedFps = Math.min(MAX_FPS, Math.round(avgFps))

		// Only update target FPS if user hasn't manually set it
		if (!isManuallySet) {
			targetFps = maxDetectedFps
			targetTimePerFrame = getTargetTimePerFrame(targetFps)
		}
	}

	// Keep only recent measurements
	if (fpsCheckHistory.length > 5) {
		fpsCheckHistory = fpsCheckHistory.slice(-3)
	}
}

// Track actual browser frame timing using requestAnimationFrame
let frameTimingRaf: number | undefined
let isFrameTimingActive = false
let measurementStartTime = 0
const MEASUREMENT_DURATION = 2000 // Continue measuring for 2 seconds after throttling activity

const startFrameTimingMeasurement = () => {
	if (isFrameTimingActive || isTest()) return

	isFrameTimingActive = true
	framesInCurrentWindow = 0
	windowStartTime = performance.now()
	measurementStartTime = windowStartTime

	const measureFrame = () => {
		// Count this frame
		framesInCurrentWindow++

		// Calculate elapsed time
		const now = performance.now()
		const elapsed = now - windowStartTime

		// Check if we should calculate FPS
		if (elapsed >= FPS_MEASUREMENT_WINDOW) {
			const measuredFps = Math.round(
				framesInCurrentWindow * (FPS_MEASUREMENT_WINDOW / elapsed) * (1000 / FPS_MEASUREMENT_WINDOW)
			)

			// Store the measurement
			fpsCheckHistory.push(measuredFps)

			// Reset for next measurement window
			framesInCurrentWindow = 0
			windowStartTime = now

			// Check if we should update target FPS
			if (fpsCheckHistory.length >= 3) {
				updateTargetFps()
			}
		}

		// Continue measuring for a reasonable period even if queue is empty
		// This ensures we collect enough data for adaptive FPS decisions
		const timeSinceStart = now - measurementStartTime
		if (
			orderedQueue.length > 0 ||
			timingBasedQueue.length > 0 ||
			timeSinceStart < MEASUREMENT_DURATION
		) {
			// eslint-disable-next-line no-restricted-globals
			frameTimingRaf = requestAnimationFrame(measureFrame)
		} else {
			isFrameTimingActive = false
		}
	}

	// eslint-disable-next-line no-restricted-globals
	frameTimingRaf = requestAnimationFrame(measureFrame)
}

const stopFrameTimingMeasurement = () => {
	if (frameTimingRaf) {
		cancelAnimationFrame(frameTimingRaf)
		frameTimingRaf = undefined
	}
	isFrameTimingActive = false
}

const flushOrderedQueue = () => {
	const now = Date.now()
	const elapsed = now - lastFlushTime

	if (elapsed >= targetTimePerFrame) {
		// Flush entire ordered queue maintaining FIFO order
		const queue = orderedQueue.splice(0, orderedQueue.length)
		for (const fn of queue) {
			fn()
		}
		lastFlushTime = now

		// Start measuring actual browser frame timing
		if (!isTest() && queue.length > 0) {
			startFrameTimingMeasurement()
		}
	}
}

const flushTimingBasedQueue = () => {
	const now = Date.now()
	const itemsToRun: TimingBasedItem[] = []
	const itemsToKeep: TimingBasedItem[] = []

	for (const item of timingBasedQueue) {
		const targetTimePerFrame = getTargetTimePerFrame(item.getTargetFps())
		const elapsed = now - item.lastRunTime

		if (elapsed >= targetTimePerFrame) {
			item.lastRunTime = now
			itemsToRun.push(item)
		} else {
			itemsToKeep.push(item)
		}
	}

	// Update the queue with items that aren't ready to run yet
	timingBasedQueue.splice(0, timingBasedQueue.length, ...itemsToKeep)

	// Execute functions that are ready to run (potentially out of order)
	for (const item of itemsToRun) {
		item.fn()
	}

	// Start measuring actual browser frame timing
	if (!isTest() && itemsToRun.length > 0) {
		startFrameTimingMeasurement()
	}
}

const flush = () => {
	// First flush ordered queue (maintains FIFO order)
	flushOrderedQueue()

	// Then flush timing-based queue (can execute out of order)
	flushTimingBasedQueue()

	// Schedule next flush if there are items still waiting
	if (orderedQueue.length > 0 || timingBasedQueue.length > 0) {
		scheduleFlush()
	}
}

const scheduleFlush = () => {
	if (frameRaf) return

	// eslint-disable-next-line no-restricted-globals
	frameRaf = requestAnimationFrame(() => {
		frameRaf = undefined
		flush()
	})
}

/**
 * Returns a throttled version of the function.
 *
 * - Without getTargetFps: Uses adaptive FPS and maintains execution order (FIFO)
 * - With getTargetFps: Uses custom FPS timing and may execute out of order for better performance
 *
 * @param fn - the function to return a throttled version of
 * @param getTargetFps - optional function that returns the current target FPS rate. When provided, the function may execute out of order.
 * @internal
 */
export function fpsThrottle(
	fn: { (): void; cancel?(): void },
	getTargetFps?: () => number
): {
	(): void
	cancel?(): void
} {
	if (isTest()) {
		fn.cancel = () => {
			if (frameRaf) {
				cancelAnimationFrame(frameRaf)
				frameRaf = undefined
			}
		}
		return fn
	}

	if (getTargetFps) {
		// Custom FPS timing - may execute out of order
		const throttledFn = () => {
			// Find existing item in queue, or add new item
			const existingIndex = timingBasedQueue.findIndex((item) => item.fn === fn)

			if (existingIndex !== -1) {
				// Item already in queue, don't add again
				return
			}

			// Add new item to timing-based queue
			timingBasedQueue.push({ fn, getTargetFps, lastRunTime: Date.now() })
			scheduleFlush()
		}

		throttledFn.cancel = () => {
			const index = timingBasedQueue.findIndex((item) => item.fn === fn)
			if (index > -1) {
				timingBasedQueue.splice(index, 1)
			}
		}

		return throttledFn
	} else {
		// Default adaptive FPS - maintains execution order
		const throttledFn = () => {
			if (orderedQueue.includes(fn)) {
				return
			}
			orderedQueue.push(fn)
			scheduleFlush()
		}

		throttledFn.cancel = () => {
			const index = orderedQueue.indexOf(fn)
			if (index > -1) {
				orderedQueue.splice(index, 1)
			}
		}

		return throttledFn
	}
}

/**
 * Calls the function on the next frame using adaptive FPS. Maintains execution order (FIFO).
 * If the same fn is passed again before the next frame, it will still be called only once.
 * @param fn - the function to call on the next frame
 * @returns a function that will cancel the call if called before the next frame
 * @internal
 */
export function throttleToNextFrame(fn: () => void): () => void {
	if (isTest()) {
		fn()
		return () => void null // noop
	}

	if (!orderedQueue.includes(fn)) {
		orderedQueue.push(fn)
		scheduleFlush()
	}

	return () => {
		const index = orderedQueue.indexOf(fn)
		if (index > -1) {
			orderedQueue.splice(index, 1)
		}
	}
}

/**
 * Gets the current target FPS (set to device's natural maximum FPS after detection).
 * @returns the current target FPS (between 30-120)
 * @internal
 */
export function getCurrentFps(): number {
	return targetFps
}

/**
 * Resets the FPS detection system back to default settings.
 * Useful for testing or when you want to re-detect the device's natural FPS.
 * @internal
 */
export function resetAdaptiveFps(): void {
	targetFps = DEFAULT_FPS
	targetTimePerFrame = getTargetTimePerFrame(targetFps)
	lastFlushTime = -targetTimePerFrame
	fpsCheckHistory = []
	framesInCurrentWindow = 0
	windowStartTime = 0
	measurementStartTime = 0
	maxDetectedFps = DEFAULT_FPS
	isManuallySet = false
	stopFrameTimingMeasurement()
}

/**
 * Manually sets the target FPS. Once set manually, the system will stop automatically adapting
 * to higher detected frame rates. Call resetAdaptiveFps() to re-enable automatic adaptation.
 * @param fps - the target FPS to set (will be clamped between 30-120)
 * @internal
 */
export function setTargetFps(fps: number): void {
	targetFps = Math.max(MIN_FPS, Math.min(MAX_FPS, fps))
	targetTimePerFrame = getTargetTimePerFrame(targetFps)
	isManuallySet = true
}
