import { TLPageId, TLRecord } from '@tldraw/tlschema'
import { TLChange } from '../App'
import { TLEventInfo } from './event-types'

/** @public */
export interface TLEventMap {
	// Lifecycle / Internal
	mount: []
	'max-shapes': [{ name: string; pageId: TLPageId; count: number }]
	change: [TLChange<TLRecord>]
	update: []
	crash: [{ error: unknown }]
	'stop-camera-animation': []
	'stop-following': []
	event: [TLEventInfo]
	tick: [number]
	'change-history': [{ reason: 'undo' | 'redo' | 'push' } | { reason: 'bail'; markId?: string }]
	'mark-history': [{ id: string }]
	// Changes
	// 'create-shapes': [{ ids: TLShapeId[]; types: TLShapeType[]; pageId: TLPageId }]
	// 'delete-shapes': [{ ids: TLShapeId[]; pageId: TLPageId }]
	// 'create-page': [{ id: TLPageId }]
	// 'delete-page': [{ id: TLPageId }]
	// 'change-page': [{ toId: TLPageId; fromId: TLPageId }]
	// 'change-camera': [TLCamera]
	// 'change-tool': { id: string }

	// Actions
	// 'set-setting': [
	// 	{
	// 		name:
	// 			| 'isToolLocked'
	// 			| 'isSnapMode'
	// 			| 'isGridMode'
	// 			| 'isDarkMode'
	// 			| 'isFocusMode'
	// 			| 'isReadOnly'
	// 			| 'isPenMode'
	// 		value: boolean
	// 	}
	// ]
	// // Actions
	// 'set-prop': [{ key: string; value: any }]
	// 'group-shapes': [{ ids: TLShapeId[]; groupId: TLShapeId }]
	// 'ungroup-shapes': [{ ids: TLShapeId[]; groupIds: TLShapeId[] }]
	// 'duplicate-page': [{ id: TLPageId; newPageId: TLPageId }]
	// 'move-to-page': [{ name: string; fromId: TLPageId; toId: TLPageId }]
	// 'pack-shapes': [{ ids: TLShapeId[]; pageId: TLPageId }]
	// 'stretch-shapes': [{ ids: TLShapeId[]; pageId: TLPageId; operation: 'horizontal' | 'vertical' }]
	// 'stack-shapes': [{ ids: TLShapeId[]; pageId: TLPageId; operation: 'horizontal' | 'vertical' }]
	// 'reorder-shapes': [
	// 	{ ids: TLShapeId[]; pageId: TLPageId; operation: 'toBack' | 'toFront' | 'forward' | 'backward' }
	// ]
	// 'flip-shapes': [{ ids: TLShapeId[]; pageId: TLPageId; operation: 'horizontal' | 'vertical' }]
	// 'distribute-shapes': [
	// 	{ ids: TLShapeId[]; pageId: TLPageId; operation: 'horizontal' | 'vertical' }
	// ]
	// 'align-shapes': [
	// 	{
	// 		ids: TLShapeId[]
	// 		pageId: TLPageId
	// 		operation: 'left' | 'center-horizontal' | 'right' | 'top' | 'center-vertical' | 'bottom'
	// 	}
	// ]
	// 'duplicate-shapes': [{ ids: TLShapeId[]; newShapeIds: TLShapeId[]; pageId: TLPageId }]
	// 'rotate-shapes': [{ ids: TLShapeId[]; pageId: TLPageId }]
	// 'nudge-shapes': [{ ids: TLShapeId[]; pageId: TLPageId }]
	// 'select-all': []
	// 'select-none': []
	// 'zoom-in': []
	// 'zoom-out': []
	// 'zoom-to-selection': []
	// 'reset-zoom': []
	// 'zoom-into-view': []
	// 'zoom-to-content': []
	// // UI
	// 'open-menu': [{ id: string }]
	// 'close-menu': [{ id: string }]
	// 'create-new-project': []
	// 'save-project-to-file': []
	// 'open-file': []
	// 'select-tool': [{ id: string }]
	// print: []
	// copy: []
	// paste: []
	// cut: []
}

/** @public */
export type TLEventMapHandler<T extends keyof TLEventMap> = (...args: TLEventMap[T]) => void
