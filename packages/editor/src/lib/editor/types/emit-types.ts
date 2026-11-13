import { HistoryEntry } from '@tldraw/store'
import { BoxModel, TLPageId, TLRecord, TLShapeId, TLWriteRejection } from '@tldraw/tlschema'
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
	/** The server rejected and reverted this user's changes. */
	'rejected-write': [{ rejections: readonly TLWriteRejection[]; rejectedBy: 'client' | 'server' }]
	dispose: []
}

/** @public */
export type TLEventMapHandler<T extends keyof TLEventMap> = (...args: TLEventMap[T]) => void
