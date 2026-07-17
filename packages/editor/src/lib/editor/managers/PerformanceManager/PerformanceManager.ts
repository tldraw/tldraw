import type { TLRecord, TLShapeId } from '@tldraw/tlschema'
import { bind } from '@tldraw/utils'
import EventEmitter from 'eventemitter3'
import type { Editor } from '../../Editor'
import type {
	TLCameraEndPerfEvent,
	TLCameraStartPerfEvent,
	TLFramePerfEvent,
	TLInteractionEndPerfEvent,
	TLInteractionStartPerfEvent,
	TLPerfEventMap,
	TLPerfLongAnimationFrame,
	TLShapeOperationPerfEvent,
	TLUndoRedoPerfEvent,
} from './perf-types'

function percentile(sorted: number[], p: number): number {
	const idx = Math.ceil(p * sorted.length) - 1
	return sorted[Math.max(0, idx)]
}

function computeFrameTimeStats(frameTimes: number[]) {
	if (frameTimes.length === 0) return { avg: 0, median: 0, p95: 0, p99: 0, min: 0, max: 0 }
	const sorted = [...frameTimes].sort((a, b) => a - b)
	const sum = sorted.reduce((a, b) => a + b, 0)
	return {
		avg: sum / sorted.length,
		median: percentile(sorted, 0.5),
		p95: percentile(sorted, 0.95),
		p99: percentile(sorted, 0.99),
		min: sorted[0],
		max: sorted[sorted.length - 1],
	}
}

function toLoafEntry(entry: PerformanceEntry): TLPerfLongAnimationFrame | null {
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

/**
 * Manages performance event subscriptions for the editor. Available as `editor.performance`.
 *
 * Listeners are lazy — internal editor hooks (frame, shape events) are only attached while
 * at least one subscriber exists, so there is zero overhead when unused.
 *
 * @example
 * ```ts
 * const unsub = editor.performance.on('interaction-end', (event) => {
 *   console.log(`${event.name}: ${event.fps.toFixed(1)} fps, p95=${event.p95FrameTime.toFixed(1)}ms`)
 * })
 * ```
 *
 * @public
 */
export class PerformanceManager {
	/** @internal */
	readonly emitter = new EventEmitter<TLPerfEventMap>()

	private editor: Editor

	// Active interaction tracking
	private activeInteraction: {
		name: string
		path: string
		startTime: number
		frameTimes: number[]
		selectedShapeTypes: Record<string, number>
		loafEntries: TLPerfLongAnimationFrame[]
	} | null = null

	// Active camera tracking
	private activeCamera: {
		type: 'panning' | 'zooming'
		startTime: number
		frameTimes: number[]
		timeout: number | null
		loafEntries: TLPerfLongAnimationFrame[]
	} | null = null

	// Lazy listener cleanup functions
	private frameCleanup: (() => void) | null = null
	private shapeCreatedCleanup: (() => void) | null = null
	private shapeEditedCleanup: (() => void) | null = null
	private shapeDeletedCleanup: (() => void) | null = null

	// LoAF observer
	private loafObserver: PerformanceObserver | null = null

	constructor(editor: Editor) {
		this.editor = editor
	}

	/**
	 * Subscribe to a performance event. Returns an unsubscribe function.
	 *
	 * @example
	 * ```ts
	 * const unsub = editor.performance.on('interaction-end', (event) => {
	 *   sendToAnalytics({ name: event.name, fps: event.fps, p95: event.p95FrameTime })
	 * })
	 * // later: unsub()
	 * ```
	 *
	 * @public
	 */
	on<K extends keyof TLPerfEventMap>(
		event: K,
		fn: (...args: TLPerfEventMap[K]) => void
	): () => void {
		this.emitter.on(event, fn as any)
		this._maybeAttachLazyListeners(event)
		return () => {
			this.emitter.off(event, fn as any)
			this._maybeDetachLazyListeners(event)
		}
	}

	/**
	 * Subscribe to a performance event once. The listener is removed after the first invocation.
	 * Returns an unsubscribe function for early removal.
	 *
	 * @public
	 */
	once<K extends keyof TLPerfEventMap>(
		event: K,
		fn: (...args: TLPerfEventMap[K]) => void
	): () => void {
		const wrapped = (...args: TLPerfEventMap[K]) => {
			;(fn as any)(...args)
			this._maybeDetachLazyListeners(event)
		}
		this.emitter.once(event, wrapped as any)
		this._maybeAttachLazyListeners(event)
		return () => {
			this.emitter.off(event, wrapped as any)
			this._maybeDetachLazyListeners(event)
		}
	}

	/** @internal */
	dispose() {
		if (this.activeCamera?.timeout) clearTimeout(this.activeCamera.timeout)
		this.activeInteraction = null
		this.activeCamera = null
		this.frameCleanup?.()
		this.frameCleanup = null
		this.shapeCreatedCleanup?.()
		this.shapeCreatedCleanup = null
		this.shapeEditedCleanup?.()
		this.shapeEditedCleanup = null
		this.shapeDeletedCleanup?.()
		this.shapeDeletedCleanup = null
		this._stopLoafObserver()
		this.emitter.removeAllListeners()
	}

	// --- Internal notification methods ---

	/** @internal */
	_notifyInteractionStart(name: string, path: string) {
		if (
			this.emitter.listenerCount('interaction-start') === 0 &&
			this.emitter.listenerCount('interaction-end') === 0
		) {
			return
		}

		if (this.activeInteraction) {
			console.warn(
				`[tldraw] New interaction '${name}' started while '${this.activeInteraction.name}' was still active`
			)
		}

		// Capture selected shape types at start
		const selectedShapeTypes: Record<string, number> = {}
		for (const shape of this.editor.getSelectedShapes()) {
			selectedShapeTypes[shape.type] = (selectedShapeTypes[shape.type] || 0) + 1
		}

		this.activeInteraction = {
			name,
			path,
			startTime: performance.now(),
			frameTimes: [],
			selectedShapeTypes,
			loafEntries: [],
		}

		const event: TLInteractionStartPerfEvent = {
			name,
			path,
			timestamp: performance.now(),
		}
		this.emitter.emit('interaction-start', event)
	}

	/** @internal */
	_notifyInteractionEnd() {
		const interaction = this.activeInteraction
		if (!interaction) return
		this.activeInteraction = null

		if (this.emitter.listenerCount('interaction-end') === 0) return

		const duration = performance.now() - interaction.startTime
		const stats = computeFrameTimeStats(interaction.frameTimes)

		const event: TLInteractionEndPerfEvent = {
			name: interaction.name,
			path: interaction.path,
			duration,
			fps:
				interaction.frameTimes.length > 0 ? (interaction.frameTimes.length / duration) * 1000 : 0,
			frameCount: interaction.frameTimes.length,
			avgFrameTime: stats.avg,
			medianFrameTime: stats.median,
			p95FrameTime: stats.p95,
			p99FrameTime: stats.p99,
			minFrameTime: stats.min,
			maxFrameTime: stats.max,
			frameTimes: interaction.frameTimes,
			shapeCount: this.editor.getCurrentPageShapeIds().size,
			selectedShapeTypes: interaction.selectedShapeTypes,
			longAnimationFrames: interaction.loafEntries.length > 0 ? interaction.loafEntries : undefined,
			zoomLevel: this.editor.getCamera().z,
			timestamp: performance.now(),
		}
		this.emitter.emit('interaction-end', event)
	}

	/** @internal */
	_notifyCameraOperation(type: 'panning' | 'zooming') {
		if (
			this.emitter.listenerCount('camera-start') === 0 &&
			this.emitter.listenerCount('camera-end') === 0
		) {
			return
		}

		if (this.activeCamera) {
			// Extend existing camera session
			if (this.activeCamera.timeout) {
				clearTimeout(this.activeCamera.timeout)
			}
			// If type changed, end old and start new
			if (this.activeCamera.type !== type) {
				this._endCameraSession()
				this._startCameraSession(type)
			} else {
				// Reset timeout
				this.activeCamera.timeout = this.editor.timers.setTimeout(
					() => this._endCameraSession(),
					50
				)
			}
		} else {
			this._startCameraSession(type)
		}
	}

	/** @internal */
	_notifyUndoRedo(type: 'undo' | 'redo', undoDepth: number, redoDepth: number) {
		if (this.emitter.listenerCount(type) === 0) return

		const event: TLUndoRedoPerfEvent = {
			type,
			undoDepth,
			redoDepth,
		}
		this.emitter.emit(type, event)
	}

	// --- Private helpers ---

	private _startCameraSession(type: 'panning' | 'zooming') {
		this.activeCamera = {
			type,
			startTime: performance.now(),
			frameTimes: [],
			timeout: this.editor.timers.setTimeout(() => this._endCameraSession(), 50),
			loafEntries: [],
		}

		if (this.emitter.listenerCount('camera-start') > 0) {
			const event: TLCameraStartPerfEvent = {
				type,
				timestamp: performance.now(),
			}
			this.emitter.emit('camera-start', event)
		}
	}

	private _endCameraSession() {
		const camera = this.activeCamera
		if (!camera) return
		this.activeCamera = null
		if (camera.timeout) clearTimeout(camera.timeout)

		if (this.emitter.listenerCount('camera-end') === 0) return

		const duration = performance.now() - camera.startTime
		const stats = computeFrameTimeStats(camera.frameTimes)
		const viewportBounds = this.editor.getViewportScreenBounds()
		const totalShapes = this.editor.getCurrentPageShapeIds().size
		const culledShapeCount = this.editor.getCulledShapes().size

		const event: TLCameraEndPerfEvent = {
			type: camera.type,
			duration,
			fps: camera.frameTimes.length > 0 ? (camera.frameTimes.length / duration) * 1000 : 0,
			frameCount: camera.frameTimes.length,
			avgFrameTime: stats.avg,
			medianFrameTime: stats.median,
			p95FrameTime: stats.p95,
			p99FrameTime: stats.p99,
			minFrameTime: stats.min,
			maxFrameTime: stats.max,
			frameTimes: camera.frameTimes,
			shapeCount: totalShapes,
			viewportWidth: viewportBounds.w,
			viewportHeight: viewportBounds.h,
			longAnimationFrames: camera.loafEntries.length > 0 ? camera.loafEntries : undefined,
			visibleShapeCount: totalShapes - culledShapeCount,
			culledShapeCount,
			zoomLevel: this.editor.getCamera().z,
			timestamp: performance.now(),
		}
		this.emitter.emit('camera-end', event)
	}

	@bind
	private _onFrame(elapsed: number) {
		// Record frame time for active interaction/camera
		if (this.activeInteraction) {
			this.activeInteraction.frameTimes.push(elapsed)
		}
		if (this.activeCamera) {
			this.activeCamera.frameTimes.push(elapsed)
		}

		// Emit standalone frame event if listeners exist
		if (this.emitter.listenerCount('frame') > 0) {
			const totalShapes = this.editor.getCurrentPageShapeIds().size
			const culledShapes = this.editor.getCulledShapes()
			const culledCount = culledShapes.size
			const event: TLFramePerfEvent = {
				elapsed,
				shapeCount: totalShapes,
				culledShapeCount: culledCount,
				visibleShapeCount: totalShapes - culledCount,
			}
			this.emitter.emit('frame', event)
		}
	}

	@bind
	private _onShapesCreated(records: TLRecord[]) {
		if (this.emitter.listenerCount('shapes-created') === 0) return
		const shapeTypes: Record<string, number> = {}
		for (const record of records) {
			if (record.typeName === 'shape') {
				shapeTypes[record.type] = (shapeTypes[record.type] || 0) + 1
			}
		}
		const count = Object.values(shapeTypes).reduce((a, b) => a + b, 0)
		if (count === 0) return
		const event: TLShapeOperationPerfEvent = {
			operation: 'create',
			count,
			shapeTypes,
			timestamp: performance.now(),
		}
		this.emitter.emit('shapes-created', event)
	}

	@bind
	private _onShapesEdited(records: TLRecord[]) {
		if (this.emitter.listenerCount('shapes-updated') === 0) return
		const shapeTypes: Record<string, number> = {}
		for (const record of records) {
			if (record.typeName === 'shape') {
				shapeTypes[record.type] = (shapeTypes[record.type] || 0) + 1
			}
		}
		const count = Object.values(shapeTypes).reduce((a, b) => a + b, 0)
		if (count === 0) return
		const event: TLShapeOperationPerfEvent = {
			operation: 'update',
			count,
			shapeTypes,
			timestamp: performance.now(),
		}
		this.emitter.emit('shapes-updated', event)
	}

	@bind
	private _onShapesDeleted(ids: TLShapeId[]) {
		if (this.emitter.listenerCount('shapes-deleted') === 0) return
		const shapeTypes: Record<string, number> = {}
		for (const id of ids) {
			// Works because 'deleted-shapes' fires before store.remove() in Editor.deleteShapes
			const shape = this.editor.getShape(id)
			if (shape) {
				shapeTypes[shape.type] = (shapeTypes[shape.type] || 0) + 1
			}
		}
		const event: TLShapeOperationPerfEvent = {
			operation: 'delete',
			count: ids.length,
			shapeTypes,
			timestamp: performance.now(),
		}
		this.emitter.emit('shapes-deleted', event)
	}

	// --- LoAF observer ---

	private _startLoafObserver() {
		if (typeof PerformanceObserver === 'undefined') return

		try {
			const supported = PerformanceObserver.supportedEntryTypes
			if (!supported?.includes('long-animation-frame')) return
		} catch {
			return
		}

		this.loafObserver = new PerformanceObserver((list) => {
			const isInteractionActive = this.activeInteraction !== null
			const isCameraActive = this.activeCamera !== null

			if (!isInteractionActive && !isCameraActive) return

			for (const entry of list.getEntries()) {
				const loaf = toLoafEntry(entry)
				if (!loaf) continue

				if (isInteractionActive) {
					this.activeInteraction!.loafEntries.push(loaf)
				}
				if (isCameraActive) {
					this.activeCamera!.loafEntries.push(loaf)
				}
			}
		})

		this.loafObserver.observe({ type: 'long-animation-frame', buffered: false })
	}

	private _stopLoafObserver() {
		if (this.loafObserver) {
			this.loafObserver.disconnect()
			this.loafObserver = null
		}
	}

	// --- Lazy listener management ---

	private _needsFrameListener(): boolean {
		return (
			this.emitter.listenerCount('frame') > 0 ||
			this.emitter.listenerCount('interaction-start') > 0 ||
			this.emitter.listenerCount('interaction-end') > 0 ||
			this.emitter.listenerCount('camera-start') > 0 ||
			this.emitter.listenerCount('camera-end') > 0
		)
	}

	private _needsLoafObserver(): boolean {
		return (
			this.emitter.listenerCount('interaction-end') > 0 ||
			this.emitter.listenerCount('camera-end') > 0
		)
	}

	private _maybeAttachLazyListeners(event: keyof TLPerfEventMap) {
		// Frame listener needed for frame event + interaction/camera frame time tracking
		if (
			!this.frameCleanup &&
			(event === 'frame' ||
				event === 'interaction-start' ||
				event === 'interaction-end' ||
				event === 'camera-start' ||
				event === 'camera-end')
		) {
			if (this._needsFrameListener()) {
				this.editor.on('frame', this._onFrame)
				this.frameCleanup = () => this.editor.off('frame', this._onFrame)
			}
		}

		// LoAF observer needed when interaction-end or camera-end listeners exist
		if (!this.loafObserver && (event === 'interaction-end' || event === 'camera-end')) {
			if (this._needsLoafObserver()) {
				this._startLoafObserver()
			}
		}

		if (!this.shapeCreatedCleanup && event === 'shapes-created') {
			this.editor.on('created-shapes', this._onShapesCreated)
			this.shapeCreatedCleanup = () => this.editor.off('created-shapes', this._onShapesCreated)
		}

		if (!this.shapeEditedCleanup && event === 'shapes-updated') {
			this.editor.on('edited-shapes', this._onShapesEdited)
			this.shapeEditedCleanup = () => this.editor.off('edited-shapes', this._onShapesEdited)
		}

		if (!this.shapeDeletedCleanup && event === 'shapes-deleted') {
			this.editor.on('deleted-shapes', this._onShapesDeleted)
			this.shapeDeletedCleanup = () => this.editor.off('deleted-shapes', this._onShapesDeleted)
		}
	}

	private _maybeDetachLazyListeners(event: keyof TLPerfEventMap) {
		if (
			this.frameCleanup &&
			(event === 'frame' ||
				event === 'interaction-start' ||
				event === 'interaction-end' ||
				event === 'camera-start' ||
				event === 'camera-end')
		) {
			if (!this._needsFrameListener()) {
				this.frameCleanup()
				this.frameCleanup = null
			}
		}

		// Stop LoAF observer when no longer needed
		if (this.loafObserver && (event === 'interaction-end' || event === 'camera-end')) {
			if (!this._needsLoafObserver()) {
				this._stopLoafObserver()
			}
		}

		if (
			this.shapeCreatedCleanup &&
			event === 'shapes-created' &&
			this.emitter.listenerCount('shapes-created') === 0
		) {
			this.shapeCreatedCleanup()
			this.shapeCreatedCleanup = null
		}

		if (
			this.shapeEditedCleanup &&
			event === 'shapes-updated' &&
			this.emitter.listenerCount('shapes-updated') === 0
		) {
			this.shapeEditedCleanup()
			this.shapeEditedCleanup = null
		}

		if (
			this.shapeDeletedCleanup &&
			event === 'shapes-deleted' &&
			this.emitter.listenerCount('shapes-deleted') === 0
		) {
			this.shapeDeletedCleanup()
			this.shapeDeletedCleanup = null
		}
	}
}
