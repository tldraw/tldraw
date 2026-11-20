import { HistoryEntry } from '@tldraw/store'
import { BoxModel, TLPageId, TLRecord, TLShapeId, TLWriteRefusal } from '@tldraw/tlschema'
import { TLEventInfo } from './event-types'

/**
 * A refused change, as the editor's `'refused'` event reports it. `source` is `'local'` when the
 * editor's own `authorize.write` refused it, and `'server'` when the room did. Either way the
 * change is already rolled back.
 *
 * @public
 */
export interface TLRefusal extends TLWriteRefusal {
	source: 'local' | 'server'
}

/** @public */
export interface TLEventMap {
	// Lifecycle / Internal
	mount: []
	unmount: []
	'max-shapes': [{ name: string; pageId: TLPageId; count: number }]
	'confirm-open-link': [{ url: string }]
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
	/** The editor or the room refused one of this user's changes. It is already rolled back. */
	refused: [TLRefusal]
	dispose: []
}

/** @public */
export type TLEventMapHandler<T extends keyof TLEventMap> = (...args: TLEventMap[T]) => void
