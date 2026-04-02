import type { Editor, TLEventInfo } from '@tldraw/editor'
import { computeApdex, p95 } from './apdex'
import { captureContext } from './context'
import { operationFromPath } from './operation-map'
import {
	DEFAULT_RUM_CONFIG,
	type RumConfig,
	type RumContext,
	type RumInteractionMetric,
	type RumLongAnimationFrame,
	type RumOperationType,
} from './types'

/** Maximum frame-time samples to keep per interaction (≈10s at 60fps). */
const MAX_FRAME_SAMPLES = 600

/** Idle timeout (ms) before a wheel-based interaction is considered finished. */
const WHEEL_IDLE_TIMEOUT = 150

/** Default satisfied threshold for detecting dropped frames (60fps). */
const DEFAULT_SATISFIED_MS = 1000 / 60

/**
 * Real User Monitoring for tldraw.
 *
 * Attaches to an `Editor` instance and measures frame-level performance
 * during interactive operations (resize, pan, zoom, etc.). Collected metrics
 * are flushed in batches to one or more {@link RumSink | sinks}.
 *
 * @example
 * ```ts
 * const rum = new RumMonitor(editor, {
 *   enabled: true,
 *   sinks: [new ConsoleSink()],
 * })
 * rum.start()
 * // later:
 * rum.dispose()
 * ```
 *
 * @public
 */
export class RumMonitor {
	private config: RumConfig
	private buffer: RumInteractionMetric[] = []
	private flushTimer: ReturnType<typeof setInterval> | null = null
	private started = false

	// --- Tool-state interaction tracking ---
	private lastPath = ''
	private activeOperation: RumOperationType | null = null
	private activeContext: RumContext | null = null
	private activeStartTime = 0
	private activeFrameTimes: number[] = []
	private skipCurrentInteraction = false

	// --- Wheel (camera) interaction tracking ---
	private wheelOperation: RumOperationType | null = null
	private wheelContext: RumContext | null = null
	private wheelStartTime = 0
	private wheelFrameTimes: number[] = []
	private wheelIdleTimer: ReturnType<typeof setTimeout> | null = null
	private skipCurrentWheel = false
	/** Tracks whether a tick occurred since the last wheel-frame push, to avoid double-counting. */
	private wheelTickPending = false

	// --- Long Animation Frame (LoAF) observer ---
	private loafObserver: PerformanceObserver | null = null
	private loafSupported = false
	private activeLoafEntries: RumLongAnimationFrame[] = []
	private wheelLoafEntries: RumLongAnimationFrame[] = []

	constructor(
		private editor: Editor,
		config: Partial<RumConfig>
	) {
		this.config = { ...DEFAULT_RUM_CONFIG, ...config }
	}

	/** Start monitoring. Attaches event listeners to the editor. */
	start(): void {
		if (this.started || !this.config.enabled) return
		this.started = true
		this.lastPath = this.editor.getPath()

		this.editor.on('tick', this.onTick)
		this.editor.on('event', this.onEvent)

		this.startLoafObserver()

		this.flushTimer = setInterval(() => this.flush(), this.config.flushInterval)
	}

	/** Stop monitoring. Detaches listeners, finalises any in-flight interaction, and flushes. */
	stop(): void {
		if (!this.started) return
		this.started = false

		this.editor.off('tick', this.onTick)
		this.editor.off('event', this.onEvent)

		this.stopLoafObserver()

		this.finaliseToolInteraction()
		this.finaliseWheelInteraction()
		this.flush()

		if (this.flushTimer !== null) {
			clearInterval(this.flushTimer)
			this.flushTimer = null
		}
	}

	/** Force-flush all buffered metrics to every sink. */
	flush(): void {
		if (this.buffer.length === 0) return
		const batch = this.buffer.splice(0, this.buffer.length)
		for (const sink of this.config.sinks) {
			try {
				sink.send(batch)
			} catch {
				// Sink errors should not break the monitor.
			}
		}
	}

	/** Stop monitoring and clean up all resources. */
	dispose(): void {
		this.stop()
		for (const sink of this.config.sinks) {
			sink.dispose?.()
		}
		if (this.wheelIdleTimer !== null) {
			clearTimeout(this.wheelIdleTimer)
			this.wheelIdleTimer = null
		}
	}

	// -----------------------------------------------------------------------
	// Tick handler — detects tool-state transitions and records frame times
	// -----------------------------------------------------------------------

	private onTick = (elapsed: number): void => {
		const path = this.editor.getPath()

		// --- Tool-state interaction tracking ---
		if (path !== this.lastPath) {
			const prevOp = this.activeOperation
			const nextOp = operationFromPath(path)

			// Exiting a measured state?
			if (prevOp !== null) {
				this.finaliseToolInteraction()
			}

			// Entering a measured state?
			if (nextOp !== null) {
				this.beginToolInteraction(nextOp)
			}

			this.lastPath = path
		}

		// Record frame time for an active tool-state interaction
		if (this.activeOperation !== null && !this.skipCurrentInteraction) {
			this.pushFrameTime(this.activeFrameTimes, elapsed)
		}

		// Record frame time for an active wheel interaction
		if (this.wheelOperation !== null && !this.skipCurrentWheel && this.wheelTickPending) {
			this.pushFrameTime(this.wheelFrameTimes, elapsed)
			this.wheelTickPending = false
		}
	}

	// -----------------------------------------------------------------------
	// Event handler — detects wheel events for camera operations
	// -----------------------------------------------------------------------

	private onEvent = (info: TLEventInfo): void => {
		if (info.type !== 'wheel') return

		const operation: RumOperationType = info.ctrlKey || info.metaKey ? 'zoom' : 'pan'

		if (this.wheelOperation === null) {
			// Start a new wheel interaction
			if (!this.shouldSample()) {
				this.skipCurrentWheel = true
			} else {
				this.skipCurrentWheel = false
			}
			this.wheelOperation = operation
			this.wheelContext = captureContext(this.editor)
			this.wheelStartTime = performance.now()
			this.wheelFrameTimes = []
			this.wheelLoafEntries = []
		}

		this.wheelTickPending = true

		// Reset idle timer
		if (this.wheelIdleTimer !== null) {
			clearTimeout(this.wheelIdleTimer)
		}
		this.wheelIdleTimer = setTimeout(() => {
			this.finaliseWheelInteraction()
		}, WHEEL_IDLE_TIMEOUT)
	}

	// -----------------------------------------------------------------------
	// Interaction lifecycle helpers
	// -----------------------------------------------------------------------

	private beginToolInteraction(operation: RumOperationType): void {
		if (!this.shouldSample()) {
			this.skipCurrentInteraction = true
			this.activeOperation = operation
			return
		}
		this.skipCurrentInteraction = false
		this.activeOperation = operation
		this.activeContext = captureContext(this.editor)
		this.activeStartTime = performance.now()
		this.activeFrameTimes = []
		this.activeLoafEntries = []
	}

	private finaliseToolInteraction(): void {
		if (this.activeOperation === null) return

		if (!this.skipCurrentInteraction && this.activeContext) {
			this.emitMetric(
				this.activeOperation,
				this.activeStartTime,
				this.activeFrameTimes,
				this.activeContext,
				this.activeLoafEntries
			)
		}

		this.activeOperation = null
		this.activeContext = null
		this.activeFrameTimes = []
		this.activeLoafEntries = []
		this.skipCurrentInteraction = false
	}

	private finaliseWheelInteraction(): void {
		if (this.wheelOperation === null) return

		if (this.wheelIdleTimer !== null) {
			clearTimeout(this.wheelIdleTimer)
			this.wheelIdleTimer = null
		}

		if (!this.skipCurrentWheel && this.wheelContext) {
			this.emitMetric(
				this.wheelOperation,
				this.wheelStartTime,
				this.wheelFrameTimes,
				this.wheelContext,
				this.wheelLoafEntries
			)
		}

		this.wheelOperation = null
		this.wheelContext = null
		this.wheelFrameTimes = []
		this.wheelLoafEntries = []
		this.skipCurrentWheel = false
		this.wheelTickPending = false
	}

	// -----------------------------------------------------------------------
	// Metric computation
	// -----------------------------------------------------------------------

	private emitMetric(
		operation: RumOperationType,
		startTime: number,
		frameTimes: number[],
		context: RumContext,
		loafEntries: RumLongAnimationFrame[]
	): void {
		const duration = performance.now() - startTime
		if (duration < this.config.minInteractionDuration) return
		if (frameTimes.length === 0) return

		const satisfiedThreshold =
			this.config.apdexThresholds[operation]?.satisfied ?? DEFAULT_SATISFIED_MS

		const sum = frameTimes.reduce((a, b) => a + b, 0)

		const metric: RumInteractionMetric = {
			operation,
			startTime,
			duration,
			frameTimes,
			avgFrameTime: sum / frameTimes.length,
			p95FrameTime: p95(frameTimes),
			droppedFrames: frameTimes.filter((t) => t > satisfiedThreshold).length,
			totalFrames: frameTimes.length,
			apdex: computeApdex(frameTimes, operation, this.config.apdexThresholds),
			context,
			longAnimationFrames: loafEntries.length > 0 ? loafEntries : undefined,
		}

		this.buffer.push(metric)

		if (this.buffer.length >= this.config.maxBufferSize) {
			this.flush()
		}
	}

	// -----------------------------------------------------------------------
	// Helpers
	// -----------------------------------------------------------------------

	private shouldSample(): boolean {
		return this.config.sampleRate >= 1 || Math.random() < this.config.sampleRate
	}

	private pushFrameTime(arr: number[], elapsed: number): void {
		if (arr.length >= MAX_FRAME_SAMPLES) {
			arr.shift()
		}
		arr.push(elapsed)
	}

	// -----------------------------------------------------------------------
	// Long Animation Frames (LoAF) observer
	// -----------------------------------------------------------------------

	private startLoafObserver(): void {
		if (typeof PerformanceObserver === 'undefined') return

		// Feature-detect LoAF support (Chromium 123+)
		try {
			const supported = PerformanceObserver.supportedEntryTypes
			if (!supported?.includes('long-animation-frame')) return
		} catch {
			return
		}

		this.loafSupported = true

		this.loafObserver = new PerformanceObserver((list) => {
			const isToolActive = this.activeOperation !== null && !this.skipCurrentInteraction
			const isWheelActive = this.wheelOperation !== null && !this.skipCurrentWheel

			if (!isToolActive && !isWheelActive) return

			for (const entry of list.getEntries()) {
				const loaf = this.toLoafEntry(entry)
				if (!loaf) continue

				if (isToolActive) {
					this.activeLoafEntries.push(loaf)
				}
				if (isWheelActive) {
					this.wheelLoafEntries.push(loaf)
				}
			}
		})

		this.loafObserver.observe({ type: 'long-animation-frame', buffered: false })
	}

	private stopLoafObserver(): void {
		if (this.loafObserver) {
			this.loafObserver.disconnect()
			this.loafObserver = null
		}
	}

	private toLoafEntry(entry: PerformanceEntry): RumLongAnimationFrame | null {
		// LoAF entries have these properties but TypeScript doesn't know about them yet
		const e = entry as PerformanceEntry & {
			blockingDuration?: number
			scripts?: ReadonlyArray<{
				sourceURL?: string
				invoker?: string
				duration?: number
			}>
		}

		if (typeof e.duration !== 'number') return null

		return {
			startTime: e.startTime,
			duration: e.duration,
			blockingDuration: e.blockingDuration ?? 0,
			scripts: (e.scripts ?? []).map((s) => ({
				sourceURL: s.sourceURL ?? '',
				invoker: s.invoker ?? '',
				duration: s.duration ?? 0,
			})),
		}
	}
}
