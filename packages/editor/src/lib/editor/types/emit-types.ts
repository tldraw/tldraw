import { HistoryEntry } from '@tldraw/store'
import { TLPageId, TLRecord } from '@tldraw/tlschema'
import { TLEventInfo } from './event-types'

/** @public */
export interface TLEventMap {
	// Lifecycle / Internal
	mount: []
	'max-shapes': [{ name: string; pageId: TLPageId; count: number }]
	change: [HistoryEntry<TLRecord>]
	update: []
	crash: [{ error: unknown }]
	'stop-camera-animation': []
	'stop-following': []
	event: [TLEventInfo]
	tick: [number]
	frame: [number]
	'change-history': [{ reason: 'undo' | 'redo' | 'push' } | { reason: 'bail'; markId?: string }]
	'mark-history': [{ id: string }]
}

/** @public */
export type TLEventMapHandler<T extends keyof TLEventMap> = (...args: TLEventMap[T]) => void
