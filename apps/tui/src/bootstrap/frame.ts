/**
 * The TUI's `requestAnimationFrame`. tldraw's TickManager re-arms a rAF every frame through
 * `@tldraw/utils` FpsScheduler (throttle.ts:50-81), which gates ticks at floor(1000/120)·0.9 =
 * 7.2 ms of Date.now() time. Frames must therefore be spaced at least 1000/maxFps apart with
 * maxFps ≤ 120, or TickManager skips ticks and the frame renders stale pointer state; below 30 fps
 * drags feel broken. Idle time parks the loop completely instead of ticking at 30 fps forever.
 */

export interface FrameSchedulerOptions {
	/** Default 60, clamped to [30, 120]. */
	maxFps?: number
	/** Clock in milliseconds, default `performance.now`. */
	now?(): number
}

export interface FrameInfo {
	frameStart: number
	/** Whether any rAF callback ran in this frame (TickManager's tick runs inside one). */
	ticked: boolean
}

export interface FrameSchedulerStats {
	frames: number
	lastFrameMs: number
	parked: boolean
}

function rethrow(error: Error): never {
	throw error
}

type FrameCallback = (time: number) => void
type AfterFrameListener = (info: FrameInfo) => void

interface InstalledTarget {
	target: Record<string, unknown>
	previousRequest: unknown
	previousCancel: unknown
}

// Below this many milliseconds a setTimeout overshoots by more than it waits (p50 +1.1 ms), so the
// scheduler spins on setImmediate instead.
const IMMEDIATE_THRESHOLD_MS = 1.2
const MAX_SPINS = 400

export class FrameScheduler {
	private readonly frameMs: number
	private readonly now: () => number

	private queue = new Map<number, FrameCallback>()
	private nextId = 1
	private inFrame = false
	private kickRequested = false
	private parked = true
	private idleFrames = 0
	private disposed = false

	private timer: NodeJS.Timeout | null = null
	private immediate: NodeJS.Immediate | null = null
	private lastFrameStart = -Infinity
	private spins = 0

	private frames = 0
	private lastFrameMs = 0

	private keepAlive: (() => boolean) | null = null
	private readonly afterFrameListeners = new Set<AfterFrameListener>()
	private readonly installed: InstalledTarget[] = []

	constructor(opts: FrameSchedulerOptions = {}) {
		const fps = Math.min(120, Math.max(30, opts.maxFps ?? 60))
		this.frameMs = 1000 / fps
		this.now = opts.now ?? (() => performance.now())
	}

	/**
	 * Backs `requestAnimationFrame`/`cancelAnimationFrame` on `globalThis` (FpsScheduler uses the
	 * bare global, throttle.ts:57) and on `win` (`@tldraw/utils` Timers uses window.*, timers.ts:126)
	 * with this scheduler. `dispose()` restores whatever was there before.
	 */
	install(win?: Window | null): void {
		const request = (cb: FrameCallback) => this.requestFrame(cb)
		const cancel = (id: number) => this.cancelFrame(id)
		const targets: unknown[] = [globalThis]
		if (win && (win as unknown) !== globalThis) targets.push(win)
		for (const t of targets) {
			const target = t as Record<string, unknown>
			this.installed.push({
				target,
				previousRequest: target.requestAnimationFrame,
				previousCancel: target.cancelAnimationFrame,
			})
			target.requestAnimationFrame = request
			target.cancelAnimationFrame = cancel
		}
	}

	requestFrame(cb: FrameCallback): number {
		const id = this.nextId++
		this.queue.set(id, cb)
		// A request made during a frame runs in the next frame, which the frame itself schedules.
		if (!this.inFrame && this.parked && !this.disposed) {
			this.parked = false
			this.schedule()
		}
		return id
	}

	cancelFrame(id: number): void {
		this.queue.delete(id)
	}

	onAfterFrame(fn: AfterFrameListener): () => void {
		this.afterFrameListeners.add(fn)
		return () => {
			this.afterFrameListeners.delete(fn)
		}
	}

	/** Input arrived: run a frame as soon as the minimum spacing allows, resuming a parked loop. */
	kick(): void {
		if (this.disposed) return
		if (this.inFrame) {
			this.kickRequested = true
			return
		}
		this.idleFrames = 0
		if (this.parked) {
			this.parked = false
			this.schedule()
		}
	}

	/**
	 * The App supplies this: `dirty || editor.listenerCount('tick') > baseline || cameraState ===
	 * 'moving' || scribbles.length > 0`. Two consecutive frames with a false answer park the loop.
	 */
	setKeepAlive(fn: () => boolean): void {
		this.keepAlive = fn
	}

	getStats(): FrameSchedulerStats {
		return { frames: this.frames, lastFrameMs: this.lastFrameMs, parked: this.parked }
	}

	isParked(): boolean {
		return this.parked
	}

	/** Number of rAF callbacks waiting for a frame (tests). */
	getPendingFrameCount(): number {
		return this.queue.size
	}

	dispose(): void {
		if (this.disposed) return
		this.disposed = true
		this.clearTimers()
		this.queue.clear()
		this.afterFrameListeners.clear()
		this.parked = true
		for (const { target, previousRequest, previousCancel } of this.installed.reverse()) {
			if (target.requestAnimationFrame !== undefined || previousRequest !== undefined) {
				target.requestAnimationFrame = previousRequest
			}
			if (target.cancelAnimationFrame !== undefined || previousCancel !== undefined) {
				target.cancelAnimationFrame = previousCancel
			}
		}
		this.installed.length = 0
	}

	private clearTimers() {
		if (this.timer) {
			clearTimeout(this.timer)
			this.timer = null
		}
		if (this.immediate) {
			clearImmediate(this.immediate)
			this.immediate = null
		}
	}

	private schedule() {
		if (this.disposed || this.timer || this.immediate) return
		const remaining = this.lastFrameStart + this.frameMs - this.now()
		if (remaining <= IMMEDIATE_THRESHOLD_MS) {
			this.immediate = setImmediate(() => this.onWake())
		} else {
			this.timer = setTimeout(() => this.onWake(), Math.floor(remaining) - 1)
		}
	}

	private onWake() {
		this.timer = null
		this.immediate = null
		if (this.disposed) return
		// Timers overshoot and undershoot; re-check the spacing and spin on setImmediate for the
		// last ~millisecond so frames never run early (an early frame fails FpsScheduler's gate).
		const remaining = this.lastFrameStart + this.frameMs - this.now()
		if (remaining > IMMEDIATE_THRESHOLD_MS) {
			this.timer = setTimeout(() => this.onWake(), Math.max(1, Math.floor(remaining) - 1))
			return
		}
		if (remaining > 0) {
			// Bounded: a fake clock never advances inside setImmediate callbacks, and ~400 immediates
			// is about the 1.2 ms being waited for anyway. Past the bound a 1 ms timer finishes the wait.
			if (this.spins < MAX_SPINS) {
				this.spins++
				this.immediate = setImmediate(() => this.onWake())
			} else {
				this.timer = setTimeout(() => this.onWake(), 1)
			}
			return
		}
		this.spins = 0
		this.runFrame()
	}

	private runFrame() {
		const frameStart = this.now()
		this.inFrame = true
		let error: Error | null = null
		let ticked = false
		try {
			const callbacks = this.queue
			this.queue = new Map()
			ticked = callbacks.size > 0
			for (const cb of callbacks.values()) {
				try {
					cb(frameStart)
				} catch (e) {
					error ??= e instanceof Error ? e : new Error(String(e))
				}
			}
			const info: FrameInfo = { frameStart, ticked }
			for (const listener of this.afterFrameListeners) {
				try {
					listener(info)
				} catch (e) {
					error ??= e instanceof Error ? e : new Error(String(e))
				}
			}
		} finally {
			this.inFrame = false
			this.lastFrameStart = frameStart
			this.frames++
			this.lastFrameMs = this.now() - frameStart
			this.decideNextFrame()
		}
		// Surface the first error only after the next frame is scheduled, so one throwing listener
		// cannot silently end the loop (the same reasoning as TickManager.tick's try/finally).
		if (error) rethrow(error)
	}

	private decideNextFrame() {
		if (this.disposed) return
		let alive = false
		try {
			alive = this.keepAlive ? this.keepAlive() : false
		} catch {
			alive = false
		}
		if (this.kickRequested) {
			this.kickRequested = false
			alive = true
		}
		this.idleFrames = alive ? 0 : this.idleFrames + 1
		if (this.idleFrames >= 2) {
			// Park: queued callbacks (TickManager's next tick) wait until kick() or a new request.
			this.parked = true
			return
		}
		this.parked = false
		this.schedule()
	}
}
