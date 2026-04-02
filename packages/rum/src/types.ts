/** The type of operation being measured. @public */
export type RumOperationType =
	| 'resize'
	| 'translate'
	| 'rotate'
	| 'brush'
	| 'draw'
	| 'erase'
	| 'crop'
	| 'drag_handle'
	| 'pan'
	| 'zoom'
	| 'scribble_brush'
	| 'laser'

/** Segmentation context captured at the start of an interaction. @public */
export interface RumContext {
	/** Total shapes on the current page. */
	shapeCount: number
	/** Bucketed shape count for aggregation. */
	shapeCountBucket: '0-50' | '50-200' | '200-500' | '500+'
	/** Number of selected shapes when the interaction started. */
	selectionSize: number
	/** Browser user agent string. */
	userAgent: string
	/** Viewport dimensions at interaction start. */
	viewport: { width: number; height: number }
}

/**
 * A long animation frame observed by the browser during an interaction.
 * Available only in browsers that support the Long Animation Frames API (Chromium 123+).
 * @public
 */
export interface RumLongAnimationFrame {
	/** Frame start time (relative to timeOrigin). */
	startTime: number
	/** Total frame duration in ms. */
	duration: number
	/** Time the main thread was blocked in ms. */
	blockingDuration: number
	/** Scripts that contributed to the long frame. */
	scripts: RumLongAnimationFrameScript[]
}

/** A script attribution entry from a long animation frame. @public */
export interface RumLongAnimationFrameScript {
	/** The script source URL (may be empty for inline scripts). */
	sourceURL: string
	/** The function name or invoker description. */
	invoker: string
	/** Time spent in this script in ms. */
	duration: number
}

/** A single completed interaction measurement. @public */
export interface RumInteractionMetric {
	/** Which operation was performed. */
	operation: RumOperationType
	/** When the interaction started (`performance.now()` timestamp). */
	startTime: number
	/** Total interaction duration in ms. */
	duration: number
	/** Per-frame durations collected during the interaction (ms). */
	frameTimes: number[]
	/** Average frame time in ms. */
	avgFrameTime: number
	/** 95th percentile frame time in ms. */
	p95FrameTime: number
	/** Frames that exceeded the satisfied threshold (dropped). */
	droppedFrames: number
	/** Total frames rendered during the interaction. */
	totalFrames: number
	/** Apdex score for this interaction (0–1). */
	apdex: number
	/** Segmentation context at time of interaction. */
	context: RumContext
	/**
	 * Long animation frames observed during this interaction (Chromium 123+).
	 * Only present when the browser supports the Long Animation Frames API.
	 * Contains frames that exceeded 50ms, with script attribution.
	 */
	longAnimationFrames?: RumLongAnimationFrame[]
}

/** Apdex thresholds for a single operation type (frame time in ms). @public */
export interface ApdexThresholds {
	/** Maximum frame time considered "satisfied" (default 16.67ms = 60fps). */
	satisfied: number
	/** Maximum frame time considered "tolerating" (default 33.33ms = 30fps). */
	tolerating: number
}

/** Pluggable output sink for RUM metrics. @public */
export interface RumSink {
	/** Called with a batch of completed interaction metrics. */
	send(metrics: RumInteractionMetric[]): void | Promise<void>
	/** Optional cleanup when the monitor is disposed. */
	dispose?(): void
}

/** Configuration for the RUM system. @public */
export interface RumConfig {
	/** Whether RUM is enabled. Default `false`. */
	enabled: boolean
	/** Sampling rate between 0 and 1. Default `1` (measure everything). The decision is per-interaction. */
	sampleRate: number
	/** Minimum interaction duration (ms) to report. Shorter interactions are discarded. Default `100`. */
	minInteractionDuration: number
	/** Custom Apdex thresholds per operation type. Overrides the defaults. */
	apdexThresholds: Partial<Record<RumOperationType, ApdexThresholds>>
	/** Metric sinks to send data to. */
	sinks: RumSink[]
	/** How often to flush batched metrics in ms. Default `10000`. */
	flushInterval: number
	/** Max metrics to buffer before auto-flush. Default `50`. */
	maxBufferSize: number
}

/** Default configuration values. @public */
export const DEFAULT_RUM_CONFIG: RumConfig = {
	enabled: false,
	sampleRate: 1,
	minInteractionDuration: 100,
	apdexThresholds: {},
	sinks: [],
	flushInterval: 10_000,
	maxBufferSize: 50,
}
