import { HistoryEntry } from '@tldraw/store'
import { BoxModel, TLPageId, TLRecord, TLRefusal, TLShapeId } from '@tldraw/tlschema'
import { TLEventInfo } from './event-types'

/** @public */
export interface TLEventMap {
	// Lifecycle / Internal
	mount: []
	unmount: []
	'max-shapes': [{ name: string; pageId: TLPageId; count: number }]
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
	/** A change of this user's was refused, by the store's write rule (`source: 'local'`) or the server; it has already been reverted. */
	refused: [TLRefusal]
	dispose: []
}

/** @public */
export type TLEventMapHandler<T extends keyof TLEventMap> = (...args: TLEventMap[T]) => void
