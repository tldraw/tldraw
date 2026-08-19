import { isShape, type TLRecord, type TLShape, type TLShapeId } from '@tldraw/tlschema'
import { bind } from '@tldraw/utils'
import EventEmitter from 'eventemitter3'
import type { Editor } from '../../Editor'
import type { TLEventMap, TLEventMapHandler } from '../../types/emit-types'
import type {
	TLCameraEndPerfEvent,
	TLCameraStartPerfEvent,
	TLFramePerfEvent,
	TLInteractionEndPerfEvent,
	TLInteractionStartPerfEvent,
	TLPerfEventMap,
	TLPerfFrameTimeStats,
	TLPerfLongAnimationFrame,
	TLShapeOperationPerfEvent,
	TLUndoRedoPerfEvent,
} from './perf-types'

interface PerfSession {
	startTime: number
	frameTimes: number[]
	loafEntries: TLPerfLongAnimationFrame[]
}

function percentile(sorted: number[], p: number): number {
	const idx = Math.ceil(p * sorted.length) - 1
	return sorted[Math.max(0, idx)]
}

function computeFrameTimeStats(session: PerfSession): TLPerfFrameTimeStats {
	const { frameTimes, loafEntries } = session
	const duration = performance.now() - session.startTime
	const sorted = [...frameTimes].sort((a, b) => a - b)
	const n = sorted.length
	const sum = sorted.reduce((a, b) => a + b, 0)
	return {
		duration,
		fps: n > 0 ? (n / duration) * 1000 : 0,
		frameCount: n,
		avgFrameTime: n > 0 ? sum / n : 0,
		medianFrameTime: n > 0 ? percentile(sorted, 0.5) : 0,
		p95FrameTime: n > 0 ? percentile(sorted, 0.95) : 0,
		p99FrameTime: n > 0 ? percentile(sorted, 0.99) : 0,
		minFrameTime: n > 0 ? sorted[0] : 0,
		maxFrameTime: n > 0 ? sorted[n - 1] : 0,
		frameTimes,
		longAnimationFrames: loafEntries.length > 0 ? loafEntries : undefined,
	}
}

function* shapeRecords(records: TLRecord[]): Generator<TLShape> {
	for (const record of records) {
		if (isShape(record)) yield record
	}
}

function countShapeTypes(shapes: Iterable<TLShape>): Record<string, number> {
	const counts: Record<string, number> = {}
	for (const shape of shapes) {
		counts[shape.type] = (counts[shape.type] || 0) + 1
	}
	return counts
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

const SHAPE_PERF_EVENTS = ['shapes-created', 'shapes-updated', 'shapes-deleted'] as const

type ShapePerfEvent = (typeof SHAPE_PERF_EVENTS)[number]

function isShapePerfEvent(event: keyof TLPerfEventMap): event is ShapePerfEvent {
	return (SHAPE_PERF_EVENTS as readonly string[]).includes(event)
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

	private activeInteraction:
		| (PerfSession & {
				name: string
				path: string
				selectedShapeTypes: Record<string, number>
		  })
		| null = null

	private activeCamera:
		| (PerfSession & {
				type: 'panning' | 'zooming'
				timeout: number | null
		  })
		| null = null

	private frameCleanup: (() => void) | null = null
	private shapeEventCleanups: { [K in ShapePerfEvent]?: () => void } = {}
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
		for (const event of SHAPE_PERF_EVENTS) {
			this.shapeEventCleanups[event]?.()
			delete this.shapeEventCleanups[event]
		}
		this._stopLoafObserver()
		this.emitter.removeAllListeners()
	}

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

		this.activeInteraction = {
			name,
			path,
			startTime: performance.now(),
			frameTimes: [],
			selectedShapeTypes: countShapeTypes(this.editor.getSelectedShapes()),
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

		const event: TLInteractionEndPerfEvent = {
			name: interaction.name,
			path: interaction.path,
			...computeFrameTimeStats(interaction),
			shapeCount: this.editor.getCurrentPageShapeIds().size,
			selectedShapeTypes: interaction.selectedShapeTypes,
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

		if (!this.activeCamera) {
			this._startCameraSession(type)
			return
		}

		if (this.activeCamera.timeout) clearTimeout(this.activeCamera.timeout)
		if (this.activeCamera.type !== type) {
			this._endCameraSession()
			this._startCameraSession(type)
		} else {
			this.activeCamera.timeout = this._scheduleCameraSessionEnd()
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

	private _scheduleCameraSessionEnd() {
		return this.editor.timers.setTimeout(() => this._endCameraSession(), 50)
	}

	private _startCameraSession(type: 'panning' | 'zooming') {
		this.activeCamera = {
			type,
			startTime: performance.now(),
			frameTimes: [],
			timeout: this._scheduleCameraSessionEnd(),
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

		const viewportBounds = this.editor.getViewportScreenBounds()
		const totalShapes = this.editor.getCurrentPageShapeIds().size
		const culledShapeCount = this.editor.getCulledShapes().size

		const event: TLCameraEndPerfEvent = {
			type: camera.type,
			...computeFrameTimeStats(camera),
			shapeCount: totalShapes,
			viewportWidth: viewportBounds.w,
			viewportHeight: viewportBounds.h,
			visibleShapeCount: totalShapes - culledShapeCount,
			culledShapeCount,
			zoomLevel: this.editor.getCamera().z,
			timestamp: performance.now(),
		}
		this.emitter.emit('camera-end', event)
	}

	@bind
	private _onFrame(elapsed: number) {
		this.activeInteraction?.frameTimes.push(elapsed)
		this.activeCamera?.frameTimes.push(elapsed)

		if (this.emitter.listenerCount('frame') > 0) {
			const totalShapes = this.editor.getCurrentPageShapeIds().size
			const culledCount = this.editor.getCulledShapes().size
			const event: TLFramePerfEvent = {
				elapsed,
				shapeCount: totalShapes,
				culledShapeCount: culledCount,
				visibleShapeCount: totalShapes - culledCount,
			}
			this.emitter.emit('frame', event)
		}
	}

	/**
	 * Counts shape records in a single pass. `count` overrides the emitted count (deletes report
	 * the number of ids requested, even if some shapes are already gone); without it, an event
	 * with no shapes is skipped.
	 */
	private _emitShapeOperationEvent(
		event: ShapePerfEvent,
		operation: TLShapeOperationPerfEvent['operation'],
		shapes: Iterable<TLShape | undefined>,
		count?: number
	) {
		if (this.emitter.listenerCount(event) === 0) return
		const shapeTypes: Record<string, number> = {}
		let shapeCount = 0
		for (const shape of shapes) {
			if (!shape) continue
			shapeTypes[shape.type] = (shapeTypes[shape.type] || 0) + 1
			shapeCount++
		}
		if (count === undefined && shapeCount === 0) return
		const perfEvent: TLShapeOperationPerfEvent = {
			operation,
			count: count ?? shapeCount,
			shapeTypes,
			timestamp: performance.now(),
		}
		this.emitter.emit(event, perfEvent)
	}

	@bind
	private _onShapesCreated(records: TLRecord[]) {
		this._emitShapeOperationEvent('shapes-created', 'create', shapeRecords(records))
	}

	@bind
	private _onShapesEdited(records: TLRecord[]) {
		this._emitShapeOperationEvent('shapes-updated', 'update', shapeRecords(records))
	}

	@bind
	private _onShapesDeleted(ids: TLShapeId[]) {
		if (this.emitter.listenerCount('shapes-deleted') === 0) return
		// Works because 'deleted-shapes' fires before store.remove() in Editor.deleteShapes
		const shapes = ids.map((id) => this.editor.getShape(id))
		this._emitShapeOperationEvent('shapes-deleted', 'delete', shapes, ids.length)
	}

	private _startLoafObserver() {
		if (typeof PerformanceObserver === 'undefined') return

		try {
			const supported = PerformanceObserver.supportedEntryTypes
			if (!supported?.includes('long-animation-frame')) return
		} catch {
			return
		}

		this.loafObserver = new PerformanceObserver((list) => {
			const { activeInteraction, activeCamera } = this
			if (!activeInteraction && !activeCamera) return

			for (const entry of list.getEntries()) {
				const loaf = toLoafEntry(entry)
				if (!loaf) continue
				activeInteraction?.loafEntries.push(loaf)
				activeCamera?.loafEntries.push(loaf)
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

	// The frame listener also feeds interaction/camera frame-time tracking, not just 'frame'.
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

	private _listen<K extends keyof TLEventMap>(event: K, fn: TLEventMapHandler<K>) {
		this.editor.on(event, fn)
		return () => this.editor.off(event, fn)
	}

	private _attachShapeListener(event: ShapePerfEvent) {
		switch (event) {
			case 'shapes-created':
				return this._listen('created-shapes', this._onShapesCreated)
			case 'shapes-updated':
				return this._listen('edited-shapes', this._onShapesEdited)
			case 'shapes-deleted':
				return this._listen('deleted-shapes', this._onShapesDeleted)
		}
	}

	private _maybeAttachLazyListeners(event: keyof TLPerfEventMap) {
		if (!this.frameCleanup && this._needsFrameListener()) {
			this.frameCleanup = this._listen('frame', this._onFrame)
		}

		if (!this.loafObserver && this._needsLoafObserver()) {
			this._startLoafObserver()
		}

		if (isShapePerfEvent(event) && !this.shapeEventCleanups[event]) {
			this.shapeEventCleanups[event] = this._attachShapeListener(event)
		}
	}

	private _maybeDetachLazyListeners(event: keyof TLPerfEventMap) {
		if (this.frameCleanup && !this._needsFrameListener()) {
			this.frameCleanup()
			this.frameCleanup = null
		}

		if (this.loafObserver && !this._needsLoafObserver()) {
			this._stopLoafObserver()
		}

		if (
			isShapePerfEvent(event) &&
			this.shapeEventCleanups[event] &&
			this.emitter.listenerCount(event) === 0
		) {
			this.shapeEventCleanups[event]!()
			delete this.shapeEventCleanups[event]
		}
	}
}
