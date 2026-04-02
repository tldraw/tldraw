/** @public */
export interface TLPerfFrameTimeStats {
	avg: number
	median: number
	p95: number
	p99: number
	min: number
	max: number
	frameTimes: number[]
}

/** @public */
export interface TLInteractionStartPerfEvent {
	name: string
	path: string
	timestamp: number
}

/** @public */
export interface TLInteractionEndPerfEvent {
	name: string
	path: string
	duration: number
	fps: number
	frameCount: number
	frameTimeStats: TLPerfFrameTimeStats
	updateCount: number
	shapeCount: number
	selectedShapeTypes: Record<string, number>
}

/** @public */
export interface TLCameraStartPerfEvent {
	type: 'panning' | 'zooming'
	timestamp: number
}

/** @public */
export interface TLCameraEndPerfEvent {
	type: 'panning' | 'zooming'
	duration: number
	fps: number
	frameCount: number
	frameTimeStats: TLPerfFrameTimeStats
	shapeCount: number
	viewport: { width: number; height: number }
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
