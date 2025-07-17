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

let targetFps = DEFAULT_FPS
let targetTimePerFrame = Math.floor(1000 / targetFps) // 16ms
let frameRaf: undefined | number
let flushRaf: undefined | number
let lastFlushTime = -targetTimePerFrame

// Performance monitoring (aligned with DefaultDebugPanel approach)
const FPS_MEASUREMENT_WINDOW = 250
let fpsCheckHistory: number[] = []
let framesInCurrentWindow = 0
let windowStartTime = 0
let consecutiveGoodFrames = 0
let consecutiveBadFrames = 0

const updateTargetFps = () => {
	if (fpsCheckHistory.length < 3) return // Need at least 3 measurements

	const avgFps = fpsCheckHistory.reduce((a, b) => a + b, 0) / fpsCheckHistory.length

	// If we're consistently performing well, try to increase FPS
	if (avgFps > targetFps) {
		consecutiveGoodFrames++
		consecutiveBadFrames = 0

		// After 3 consecutive good performance checks, try to increase FPS
		if (consecutiveGoodFrames >= 3 && targetFps < MAX_FPS) {
			const newFps = Math.min(MAX_FPS, targetFps + 10)
			targetFps = newFps
			targetTimePerFrame = Math.floor(1000 / targetFps)
			consecutiveGoodFrames = 0
		}
	}
	// If we're consistently performing poorly, decrease FPS
	else if (avgFps < targetFps) {
		consecutiveBadFrames++
		consecutiveGoodFrames = 0

		// After 2 consecutive bad performance checks, decrease FPS
		if (consecutiveBadFrames >= 2 && targetFps > MIN_FPS) {
			const newFps = Math.max(MIN_FPS, targetFps - 10)
			targetFps = newFps
			targetTimePerFrame = Math.floor(1000 / targetFps)
			consecutiveBadFrames = 0
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

const startFrameTimingMeasurement = () => {
	if (isFrameTimingActive || isTest()) return

	isFrameTimingActive = true
	framesInCurrentWindow = 0
	windowStartTime = performance.now()

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

		// Continue measuring as long as there are functions being throttled
		if (fpsQueue.length > 0) {
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
 * The target frame rate is adaptive (30-120fps, starting at 60fps).
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
 * Calls the function on the next frame. The target frame rate is adaptive (30-120fps, starting at 60fps).
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
 * Gets the current adaptive target FPS.
 * @returns the current target FPS (between 30-120)
 * @internal
 */
export function getCurrentFps(): number {
	return targetFps
}

/**
 * Resets the adaptive FPS system back to default settings.
 * Useful for testing or manual performance adjustments.
 * @internal
 */
export function resetAdaptiveFps(): void {
	targetFps = DEFAULT_FPS
	targetTimePerFrame = Math.floor(1000 / targetFps)
	fpsCheckHistory = []
	framesInCurrentWindow = 0
	windowStartTime = 0
	consecutiveGoodFrames = 0
	consecutiveBadFrames = 0
	stopFrameTimingMeasurement()
}

/**
 * Manually sets the target FPS (will be overridden by adaptive system).
 * @param fps - the target FPS to set (will be clamped between 30-120)
 * @internal
 */
export function setTargetFps(fps: number): void {
	targetFps = Math.max(MIN_FPS, Math.min(MAX_FPS, fps))
	targetTimePerFrame = Math.floor(1000 / targetFps)
}
