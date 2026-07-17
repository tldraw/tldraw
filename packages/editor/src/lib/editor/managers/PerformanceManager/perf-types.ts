/**
 * Common frame time statistics shared by interaction and camera end events.
 * @public
 */
export interface TLPerfFrameTimeStats {
	/** Total duration of the session in ms. */
	duration: number
	/** Average frames per second during the session. */
	fps: number
	/** Total number of frames recorded. */
	frameCount: number
	/** Mean frame duration in ms. */
	avgFrameTime: number
	/** Median (p50) frame duration in ms. */
	medianFrameTime: number
	/** 95th percentile frame duration in ms. */
	p95FrameTime: number
	/** 99th percentile frame duration in ms. */
	p99FrameTime: number
	/** Shortest frame duration in ms. */
	minFrameTime: number
	/** Longest frame duration in ms. */
	maxFrameTime: number
	/** Raw frame durations for local analysis. Exclude when sending to analytics. */
	frameTimes: number[]
	/**
	 * Long animation frames observed during this period (Chromium 123+).
	 * Only present when the browser supports the Long Animation Frames API and
	 * at least one long frame was observed.
	 * Exclude when sending to analytics — entries are large and contain script URLs.
	 */
	longAnimationFrames?: TLPerfLongAnimationFrame[]
}

/**
 * Emitted when an interaction state (e.g. translating, resizing) is entered.
 * @public
 */
export interface TLInteractionStartPerfEvent {
	/** The state node id (e.g. `'translating'`). */
	name: string
	/** Full tool path (e.g. `'select.translating'`). */
	path: string
	/** `performance.now()` when the interaction started. */
	timestamp: number
}

/**
 * Emitted when an interaction state is exited, with aggregated frame time stats.
 * @public
 */
export interface TLInteractionEndPerfEvent extends TLPerfFrameTimeStats {
	/** The state node id (e.g. `'translating'`). */
	name: string
	/** Full tool path (e.g. `'select.translating'`). */
	path: string
	/** Total shapes on the current page. */
	shapeCount: number
	/** Breakdown of selected shape types at interaction start (e.g. `{ geo: 2, draw: 1 }`). */
	selectedShapeTypes: Record<string, number>
	/** Camera zoom level (`camera.z`) at interaction end. */
	zoomLevel: number
	/** `performance.now()` when the interaction ended. */
	timestamp: number
}

/**
 * Emitted when a camera operation (pan or zoom) begins.
 * @public
 */
export interface TLCameraStartPerfEvent {
	/** Whether this is a pan or zoom operation. */
	type: 'panning' | 'zooming'
	/** `performance.now()` when the camera session started. */
	timestamp: number
}

/**
 * Emitted when a camera operation ends (after a 50ms debounce), with aggregated frame time stats.
 * @public
 */
export interface TLCameraEndPerfEvent extends TLPerfFrameTimeStats {
	/** Whether this was a pan or zoom operation. */
	type: 'panning' | 'zooming'
	/** Total shapes on the current page. */
	shapeCount: number
	/** Number of shapes visible (not culled) in the viewport. */
	visibleShapeCount: number
	/** Number of shapes culled (off-screen) from rendering. */
	culledShapeCount: number
	/** Viewport width in screen pixels. */
	viewportWidth: number
	/** Viewport height in screen pixels. */
	viewportHeight: number
	/** Camera zoom level (`camera.z`) at session end. */
	zoomLevel: number
	/** `performance.now()` when the camera session ended. */
	timestamp: number
}

/**
 * Emitted when shapes are created, updated, or deleted.
 * @public
 */
export interface TLShapeOperationPerfEvent {
	/** The operation type. */
	operation: 'create' | 'update' | 'delete'
	/** Number of shapes affected. */
	count: number
	/** Breakdown by shape type (e.g. `{ geo: 2, draw: 1 }`). */
	shapeTypes: Record<string, number>
	/** `performance.now()` when the operation occurred. */
	timestamp: number
}

/**
 * Emitted every animation frame when at least one `'frame'` listener is registered.
 * @public
 */
export interface TLFramePerfEvent {
	/** Time since the last frame in ms. */
	elapsed: number
	/** Total shapes on the current page. */
	shapeCount: number
	/** Number of shapes culled (off-screen) from rendering. */
	culledShapeCount: number
	/** Number of shapes visible (not culled) in the viewport. */
	visibleShapeCount: number
}

/**
 * Emitted after an undo or redo operation.
 * @public
 */
export interface TLUndoRedoPerfEvent {
	/** Whether this was an undo or redo. */
	type: 'undo' | 'redo'
	/** Number of undo steps remaining. */
	undoDepth: number
	/** Number of redo steps remaining. */
	redoDepth: number
}

/**
 * A long animation frame observed by the browser during an interaction.
 * Available only in browsers that support the Long Animation Frames API (Chromium 123+).
 * @public
 */
export interface TLPerfLongAnimationFrame {
	/** Frame start time (relative to timeOrigin). */
	startTime: number
	/** Total frame duration in ms. */
	duration: number
	/** Time the main thread was blocked in ms. */
	blockingDuration: number
	/** Scripts that contributed to the long frame. */
	scripts: TLPerfLongAnimationFrameScript[]
}

/** A script attribution entry from a long animation frame. @public */
export interface TLPerfLongAnimationFrameScript {
	/** The script source URL (may be empty for inline scripts). */
	sourceURL: string
	/** The function name or invoker description. */
	invoker: string
	/** Time spent in this script in ms. */
	duration: number
}

/**
 * Map of all performance event names to their payload types.
 * Used with {@link PerformanceManager.on} and {@link PerformanceManager.once}.
 * @public
 */
export interface TLPerfEventMap {
	/** An interaction state was entered. */
	'interaction-start': [TLInteractionStartPerfEvent]
	/** An interaction state was exited, with aggregated frame time stats. */
	'interaction-end': [TLInteractionEndPerfEvent]
	/** A camera operation (pan/zoom) began. */
	'camera-start': [TLCameraStartPerfEvent]
	/** A camera operation ended (after debounce), with aggregated frame time stats. */
	'camera-end': [TLCameraEndPerfEvent]
	/** Shapes were created. */
	'shapes-created': [TLShapeOperationPerfEvent]
	/** Shapes were updated. */
	'shapes-updated': [TLShapeOperationPerfEvent]
	/** Shapes were deleted. */
	'shapes-deleted': [TLShapeOperationPerfEvent]
	/** An animation frame was rendered. Only fires when listeners are registered. */
	frame: [TLFramePerfEvent]
	/** An undo operation was performed. */
	undo: [TLUndoRedoPerfEvent]
	/** A redo operation was performed. */
	redo: [TLUndoRedoPerfEvent]
}
