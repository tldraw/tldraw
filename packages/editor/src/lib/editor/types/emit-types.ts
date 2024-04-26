import { HistoryEntry } from '@tldraw/store'
import { TLPageId, TLRecord, TLShapeId } from '@tldraw/tlschema'
import { TLEditorErrorType } from './editor-result-types'
import { TLEventInfo } from './event-types'

/** @public */
export type TLErrorEvent = {
	type: TLEditorErrorType
	value: [{ name: string; pageId: TLPageId; count: number }]
}

/** @public */
export interface TLEventMap {
	// Lifecycle / Internal
	mount: []
	change: [HistoryEntry<TLRecord>]
	update: []
	crash: [{ error: unknown }]
	'stop-camera-animation': []
	'stop-following': []
	event: [TLEventInfo]
	tick: [number]
	frame: [number]
	'select-all-text': [{ shapeId: TLShapeId }]
	error: [TLErrorEvent]
}

/** @public */
export type TLEventMapHandler<T extends keyof TLEventMap> = (...args: TLEventMap[T]) => void
