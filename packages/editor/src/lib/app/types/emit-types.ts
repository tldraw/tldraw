import { TLCamera, TLPageId, TLShapeId, TLShapeType } from '@tldraw/tlschema'
import { TLChange } from '../App'
import { TLEventInfo } from './event-types'

/** @public */
export interface TLEventMap {
	mount: []
	'group-shapes': [{ ids: TLShapeId[]; groupId: TLShapeId }]
	'ungroup-shapes': [{ ids: TLShapeId[]; groupIds: TLShapeId[] }]
	'max-shapes': [{ name: string; pageId: TLPageId; count: number }]
	change: [TLChange]
	update: []
	crash: [{ error: unknown }]
	event: [TLEventInfo]
	tick: [number]
	'change-history': [
		| { reason: 'undo' | 'redo' | 'push' }
		| { reason: 'mark'; markId: string }
		| { reason: 'bail'; markId?: string }
	]
	'change-prop': [{ key: string; value: any }]
	'create-page': [{ id: TLPageId }]
	'delete-page': [{ id: TLPageId }]
	'duplicate-page': [{ id: TLPageId; newPageId: TLPageId }]
	'moved-to-page': [{ name: string; fromId: TLPageId; toId: TLPageId }]
	'change-camera': [TLCamera]
	'stop-camera-animation': []
	'stop-following': []
	'create-shapes': [{ ids: TLShapeId[]; types: TLShapeType[]; pageId: TLPageId }]
	'delete-shapes': [{ ids: TLShapeId[]; pageId: TLPageId }]
	'change-page': [{ toId: TLPageId; fromId: TLPageId }]
	'change-setting': [
		{
			name:
				| 'isToolLocked'
				| 'isSnapMode'
				| 'isGridMode'
				| 'isDarkMode'
				| 'isFocusMode'
				| 'isReadOnly'
				| 'isPenMode'
			value: boolean
		}
	]
	'pack-shapes': [{ ids: TLShapeId[]; pageId: TLPageId }]
	'stretch-shapes': [{ ids: TLShapeId[]; pageId: TLPageId; operation: 'horizontal' | 'vertical' }]
	'stack-shapes': [{ ids: TLShapeId[]; pageId: TLPageId; operation: 'horizontal' | 'vertical' }]
	'reorder-shapes': [
		{ ids: TLShapeId[]; pageId: TLPageId; operation: 'toBack' | 'toFront' | 'forward' | 'backward' }
	]
	'flip-shapes': [{ ids: TLShapeId[]; pageId: TLPageId; operation: 'horizontal' | 'vertical' }]
	'distribute-shapes': [
		{ ids: TLShapeId[]; pageId: TLPageId; operation: 'horizontal' | 'vertical' }
	]
	'align-shapes': [
		{
			ids: TLShapeId[]
			pageId: TLPageId
			operation: 'left' | 'center-horizontal' | 'right' | 'top' | 'center-vertical' | 'bottom'
		}
	]
	'change-tool': {
		id: string
	}
	'duplicate-shapes': {
		ids: TLShapeId[]
		newShapeIds: TLShapeId[]
		pageId: TLPageId
	}
	'rotate-shapes': {
		ids: TLShapeId[]
		pageId: TLPageId
	}
	'nudge-shapes': [
		{
			ids: TLShapeId[]
			pageId: TLPageId
		}
	]
	'select-all': []
	'select-none': []
	'zoom-in': []
	'zoom-out': []
	'zoom-to-selection': []
	'reset-zoom': []
	'zoom-into-view': []
	'back-to-content': []
	// UI
	'open-menu': [{ id: string }]
	'close-menu': [{ id: string }]
	'create-new-project': []
	'save-project-to-file': []
	'open-file': []
	'select-tool': [{ id: string }]
	print: []
	copy: []
	paste: []
	cut: []
}
