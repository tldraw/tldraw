import { HistoryEntry } from '@tldraw/store'
import { BoxModel, TLPageId, TLRecord, TLShapeId } from '@tldraw/tlschema'
import { TLEventInfo } from './event-types'

/**
 * Why the editor skipped a write instead of applying it.
 *
 * - `readonly`: the editor is in readonly mode.
 * - `locked`: the shape, or one of its ancestors, is locked.
 * - `not-found`: the record to update doesn't exist.
 * - `missing-reference`: the write points at a record that doesn't exist, e.g. a binding to a
 *   missing shape or a shape whose parent is missing. A shape with a missing parent is still
 *   created, but under a different parent.
 * - `not-allowed`: the editor doesn't allow it, e.g. deleting the last page, or
 *   {@link Editor.canBindShapes} returned false.
 * - `max-shapes`: the page would exceed {@link TldrawOptions.maxShapesPerPage}.
 * - `max-pages`: the document would exceed {@link TldrawOptions.maxPages}.
 *
 * @public
 */
export type TLWriteSkipReason =
	| 'readonly'
	| 'locked'
	| 'not-found'
	| 'missing-reference'
	| 'not-allowed'
	| 'max-shapes'
	| 'max-pages'

/**
 * A write that the editor skipped. See {@link Editor.getLastSkippedWrite}.
 *
 * @public
 */
export interface TLSkippedWrite {
	/** Why the write was skipped. */
	reason: TLWriteSkipReason
	/**
	 * The editor method where the write stopped, e.g. `updateShapes`. This can be a method that
	 * the called one used, e.g. `toggleLock` on a shape in a locked frame reports `updateShapes`.
	 */
	method: string
	/** Ids of the records involved; for `missing-reference`, the ids that don't exist. Empty for `readonly`. */
	ids: TLRecord['id'][]
}

/** @public */
export interface TLEventMap {
	// Lifecycle / Internal
	mount: []
	unmount: []
	'max-shapes': [{ name: string; pageId: TLPageId; count: number }]
	'write-skipped': [TLSkippedWrite]
	change: [HistoryEntry<TLRecord>]
	update: []
	crash: [{ error: unknown }]
	'stop-camera-animation': []
	'stop-following': []
	'before-event': [TLEventInfo]
	event: [TLEventInfo]
	tick: [number]
	frame: [number]
	resize: [BoxModel]
	'select-all-text': [{ shapeId: TLShapeId }]
	'place-caret': [{ shapeId: TLShapeId; point: { x: number; y: number } }]
	'created-shapes': [TLRecord[]]
	'edited-shapes': [TLRecord[]]
	'deleted-shapes': [TLShapeId[]]
	edit: []
	dispose: []
}

/** @public */
export type TLEventMapHandler<T extends keyof TLEventMap> = (...args: TLEventMap[T]) => void
