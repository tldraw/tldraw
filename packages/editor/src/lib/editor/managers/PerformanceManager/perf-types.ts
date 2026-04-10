/** @public */
export interface TLPerfFrameTimeStats {
	duration: number
	fps: number
	frameCount: number
	avgFrameTime: number
	medianFrameTime: number
	p95FrameTime: number
	p99FrameTime: number
	minFrameTime: number
	maxFrameTime: number
	/** Raw frame durations for local analysis. Exclude when sending to analytics. */
	frameTimes: number[]
	/**
	 * Long animation frames observed during this period (Chromium 123+).
	 * Only present when the browser supports the Long Animation Frames API and
	 * at least one long frame was observed.
	 */
	longAnimationFrames?: TLPerfLongAnimationFrame[]
}

/** @public */
export interface TLInteractionStartPerfEvent {
	name: string
	path: string
	timestamp: number
}

/** @public */
export interface TLInteractionEndPerfEvent extends TLPerfFrameTimeStats {
	name: string
	path: string
	shapeCount: number
	selectedShapeTypes: Record<string, number>
	zoomLevel: number
	timestamp: number
}

/** @public */
export interface TLCameraStartPerfEvent {
	type: 'panning' | 'zooming'
	timestamp: number
}

/** @public */
export interface TLCameraEndPerfEvent extends TLPerfFrameTimeStats {
	type: 'panning' | 'zooming'
	shapeCount: number
	viewportWidth: number
	viewportHeight: number
	visibleShapeCount: number
	culledShapeCount: number
	zoomLevel: number
	timestamp: number
}

/** @public */
export interface TLShapeOperationPerfEvent {
	operation: 'create' | 'update' | 'delete'
	count: number
	shapeTypes: Record<string, number>
	timestamp: number
}

/** @public */
export interface TLFramePerfEvent {
	elapsed: number
	shapesOnPage: number
	culledShapeCount: number
	visibleShapeCount: number
}

/** @public */
export interface TLUndoRedoPerfEvent {
	type: 'undo' | 'redo'
	undoDepth: number
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

/** @public */
export interface TLPerfEventMap {
	'interaction:start': [TLInteractionStartPerfEvent]
	'interaction:end': [TLInteractionEndPerfEvent]
	'camera:start': [TLCameraStartPerfEvent]
	'camera:end': [TLCameraEndPerfEvent]
	'shapes:created': [TLShapeOperationPerfEvent]
	'shapes:updated': [TLShapeOperationPerfEvent]
	'shapes:deleted': [TLShapeOperationPerfEvent]
	frame: [TLFramePerfEvent]
	undo: [TLUndoRedoPerfEvent]
	redo: [TLUndoRedoPerfEvent]
}
