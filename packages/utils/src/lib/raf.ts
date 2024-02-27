const isTest = () =>
	typeof process !== 'undefined' &&
	process.env.NODE_ENV === 'test' &&
	// @ts-expect-error
	!globalThis.__FORCE_RAF_IN_TESTS__

const rafQueue: Array<() => void> = []

type RenderingMode = 'raf' | 'sixtyFps'
type UpdateMode = 'onTick' | 'onPointerMove'
type ReactUpdateMode = 'original' | 'throttled'

// How do we schedule the updates? Either every 16ms or on raf
export const renderingMode: RenderingMode = 'sixtyFps'
// export const renderingMode: RenderingMode = 'raf'
// How does we process the updates? Either onTick or onPointerMove
export const updateMode: UpdateMode = 'onTick'
// export const updateMode: UpdateMode = 'onPointerMove'
// How do we notifiy React about updates? Either original (as soon as the change occurs) or throttled
export const reactUpdateMode: ReactUpdateMode = 'throttled'
// export const reactUpdateMode: ReactUpdateMode = 'original'

let timesBetweenFrames: number[] = []
let lastFrameTime = 0

const tick = () => {
	const now = Date.now()
	const timeSinceLastTick = now - lastFrameTime
	if (timeSinceLastTick < 1000) {
		timesBetweenFrames.push(timeSinceLastTick)
	}
	if (timesBetweenFrames.length > 100) {
		console.log('resetting fps')
		timesBetweenFrames = []
	}
	const average = timesBetweenFrames.reduce((a, b) => a + b, 0) / timesBetweenFrames.length
	const fps = `${Math.round(1000 / average)}fps`
	console.log('time since last tick', timeSinceLastTick, fps)
	lastFrameTime = now

	const queue = rafQueue.splice(0, rafQueue.length)
	for (const fn of queue) {
		fn()
	}
}

const fps = 60
const timePerFrame = 1000 / fps
let frame: number | undefined
let time = 0
let last = 0

function sixtyFps() {
	if (frame) return
	const now = Date.now()
	const elapsed = now - last

	// console.log('time, elapsed', time, elapsed)
	if (time + elapsed < timePerFrame) {
		// console.log('skipping frame')
		frame = requestAnimationFrame(() => {
			frame = undefined
			sixtyFps()
		})
		return
	}
	frame = requestAnimationFrame(() => {
		frame = undefined
		last = now
		// If we fall behind more than 10 frames, we'll just reset the time so we don't
		// try to update a number of times
		time = Math.min(time + elapsed - timePerFrame, timePerFrame * 10)
		tick()
	})
}

function raf() {
	if (frame) {
		return
	}

	requestAnimationFrame(() => {
		frame = undefined
		tick()
	})
}

let started = false

/**
 * Returns a throttled version of the function that will only be called max once per frame.
 * @param fn - the fun to return a throttled version of
 * @returns
 * @internal
 */
export function rafThrottle(fn: () => void) {
	if (isTest()) {
		return fn
	}

	return () => {
		if (rafQueue.includes(fn)) {
			return
		}
		rafQueue.push(fn)
		if (renderingMode === 'sixtyFps') {
			if (!started) {
				started = true
				last = Date.now() - 20
			}
			sixtyFps()
		} else {
			raf()
		}
	}
}

/**
 * Calls the function on the next frame.
 * If the same fn is passed again before the next frame, it will still be called only once.
 * @param fn - the fun to call on the next animation frame
 * @returns
 * @internal
 */
export function throttledRaf(fn: () => void) {
	if (isTest()) {
		return fn()
	}

	if (rafQueue.includes(fn)) {
		return
	}

	rafQueue.push(fn)
	if (frame) return
	if (renderingMode === 'sixtyFps') {
		if (!started) {
			started = true
			last = Date.now() - 20
		}
		sixtyFps()
	} else {
		raf()
	}
}
