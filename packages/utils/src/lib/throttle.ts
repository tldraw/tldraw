const isTest = () =>
	typeof process !== 'undefined' &&
	process.env.NODE_ENV === 'test' &&
	// @ts-expect-error
	!globalThis.__FORCE_RAF_IN_TESTS__

const fpsQueue: Array<() => void> = []

// Adaptive FPS system
const MIN_FPS = 30
const MAX_FPS = 120
const DEFAULT_FPS = 60

const getTargetTimePerFrame = (fps: number) => Math.floor(1000 / fps) * 0.9 // e.g. ~15ms for 60 - we allow for some variance as browsers aren't that precise.

let targetFps = DEFAULT_FPS
let targetTimePerFrame = getTargetTimePerFrame(targetFps)
let frameRaf: undefined | number
let flushRaf: undefined | number
let lastFlushTime = -targetTimePerFrame

// Performance monitoring - tracks maximum detected FPS (device's natural refresh rate)
const FPS_MEASUREMENT_WINDOW = 250
let fpsCheckHistory: number[] = []
let framesInCurrentWindow = 0
let windowStartTime = 0
let maxDetectedFps = DEFAULT_FPS // Track the highest FPS we've measured
let measurementCount = 0
const DETECTION_MEASUREMENTS = 10 // Number of measurements to collect before settling on max FPS

const updateTargetFps = () => {
	if (fpsCheckHistory.length < 3) return // Need at least 3 measurements

	const avgFps = fpsCheckHistory.reduce((a, b) => a + b, 0) / fpsCheckHistory.length

	// Track the maximum FPS we've detected (likely the device's natural refresh rate)
	if (avgFps > maxDetectedFps) {
		maxDetectedFps = Math.min(MAX_FPS, Math.round(avgFps))
	}

	measurementCount++

	// After collecting enough measurements, set target to the maximum detected FPS
	if (measurementCount >= DETECTION_MEASUREMENTS) {
		targetFps = maxDetectedFps
		targetTimePerFrame = getTargetTimePerFrame(targetFps)
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
		if (fpsQueue.length > 0 || timeSinceStart < MEASUREMENT_DURATION) {
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

const flush = () => {
	const queue = fpsQueue.splice(0, fpsQueue.length)
	for (const fn of queue) {
		fn()
	}

	// Start measuring actual browser frame timing
	if (!isTest()) {
		startFrameTimingMeasurement()
	}
}

function tick(isOnNextFrame = false) {
	if (frameRaf) return

	const now = Date.now()
	const elapsed = now - lastFlushTime

	if (elapsed < targetTimePerFrame) {
		// If we're too early to flush, we need to wait until the next frame to try and flush again.
		// eslint-disable-next-line no-restricted-globals
		frameRaf = requestAnimationFrame(() => {
			frameRaf = undefined
			tick(true)
		})
		return
	}

	if (isOnNextFrame) {
		// If we've already waited for the next frame to run the tick, then we can flush immediately
		if (flushRaf) return // ...though if there's a flush raf, that means we'll be flushing on this frame already, so we can do nothing here.
		lastFlushTime = now
		flush()
	} else {
		// If we haven't already waited for the next frame to run the tick, we need to wait until the next frame to flush.
		if (flushRaf) return // ...though if there's a flush raf, that means we'll be flushing on the next frame already, so we can do nothing here.
		// eslint-disable-next-line no-restricted-globals
		flushRaf = requestAnimationFrame(() => {
			flushRaf = undefined
			lastFlushTime = now
			flush()
		})
	}
}

/**
 * Returns a throttled version of the function that will only be called max once per frame.
 * The target frame rate adapts to the device's natural maximum FPS (30-120fps, starting at 60fps).
 * @param fn - the fun to return a throttled version of
 * @returns
 * @internal
 */
export function fpsThrottle(fn: { (): void; cancel?(): void }): {
	(): void
	cancel?(): void
} {
	if (isTest()) {
		fn.cancel = () => {
			if (frameRaf) {
				cancelAnimationFrame(frameRaf)
				frameRaf = undefined
			}
			if (flushRaf) {
				cancelAnimationFrame(flushRaf)
				flushRaf = undefined
			}
		}
		return fn
	}

	const throttledFn = () => {
		if (fpsQueue.includes(fn)) {
			return
		}
		fpsQueue.push(fn)
		tick()
	}
	throttledFn.cancel = () => {
		const index = fpsQueue.indexOf(fn)
		if (index > -1) {
			fpsQueue.splice(index, 1)
		}
	}
	return throttledFn
}

/**
 * Calls the function on the next frame. The target frame rate adapts to the device's natural maximum FPS (30-120fps, starting at 60fps).
 * If the same fn is passed again before the next frame, it will still be called only once.
 * @param fn - the fun to call on the next frame
 * @returns a function that will cancel the call if called before the next frame
 * @internal
 */
export function throttleToNextFrame(fn: () => void): () => void {
	if (isTest()) {
		fn()
		return () => void null // noop
	}

	if (!fpsQueue.includes(fn)) {
		fpsQueue.push(fn)
		tick()
	}

	return () => {
		const index = fpsQueue.indexOf(fn)
		if (index > -1) {
			fpsQueue.splice(index, 1)
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
	fpsCheckHistory = []
	framesInCurrentWindow = 0
	windowStartTime = 0
	measurementStartTime = 0
	measurementCount = 0
	maxDetectedFps = DEFAULT_FPS
	stopFrameTimingMeasurement()
}

/**
 * Manually sets the target FPS (may be overridden if natural FPS detection is still active).
 * @param fps - the target FPS to set (will be clamped between 30-120)
 * @internal
 */
export function setTargetFps(fps: number): void {
	targetFps = Math.max(MIN_FPS, Math.min(MAX_FPS, fps))
	targetTimePerFrame = getTargetTimePerFrame(targetFps)
}
