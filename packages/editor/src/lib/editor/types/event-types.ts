import { TLHandle, TLShape, Vec2dModel } from '@tldraw/tlschema'
import { VecLike } from '../../primitives/Vec2d'
import { TLSelectionHandle } from './selection-types'

/** @public */
export type UiEventType = 'pointer' | 'click' | 'keyboard' | 'wheel' | 'pinch' | 'zoom'

/** @public */
export type TLPointerEventTarget =
	| { target: 'canvas'; shape?: undefined }
	| { target: 'selection'; handle?: TLSelectionHandle; shape?: undefined }
	| { target: 'shape'; shape: TLShape }
	| { target: 'handle'; shape: TLShape; handle: TLHandle }

/** @public */
export type TLPointerEventName =
	| 'pointer_down'
	| 'pointer_move'
	| 'pointer_up'
	| 'right_click'
	| 'middle_click'

/** @public */
export type TLCLickEventName = 'double_click' | 'triple_click' | 'quadruple_click'

/** @public */
export type TLPinchEventName = 'pinch_start' | 'pinch' | 'pinch_end'

/** @public */
export type TLKeyboardEventName = 'key_down' | 'key_up' | 'key_repeat'

/** @public */
export type TLEventName =
	| TLPointerEventName
	| TLCLickEventName
	| TLPinchEventName
	| TLKeyboardEventName
	| 'wheel'
	| 'cancel'
	| 'complete'
	| 'interrupt'

/** @public */
export interface TLBaseEventInfo {
	type: UiEventType
	shiftKey: boolean
	altKey: boolean
	ctrlKey: boolean
}

/** @public */
export type TLPointerEventInfo = TLBaseEventInfo & {
	type: 'pointer'
	name: TLPointerEventName
	point: VecLike
	pointerId: number
	button: number
	isPen: boolean
} & TLPointerEventTarget

/** @public */
export type TLClickEventInfo = TLBaseEventInfo & {
	type: 'click'
	name: TLCLickEventName
	point: VecLike
	pointerId: number
	button: number
	phase: 'down' | 'up' | 'settle'
} & TLPointerEventTarget

/** @public */
export type TLKeyboardEventInfo = TLBaseEventInfo & {
	type: 'keyboard'
	name: TLKeyboardEventName
	key: string
	code: string
}

/** @public */
export type TLPinchEventInfo = TLBaseEventInfo & {
	type: 'pinch'
	name: TLPinchEventName
	point: Vec2dModel
	delta: Vec2dModel
}

/** @public */
export type TLWheelEventInfo = TLBaseEventInfo & {
	type: 'wheel'
	name: 'wheel'
	delta: Vec2dModel
	point: Vec2dModel
}

/** @public */
export type TLCancelEventInfo = { type: 'misc'; name: 'cancel' }
/** @public */
export type TLCompleteEventInfo = { type: 'misc'; name: 'complete' }
/** @public */
export type TLInterruptEventInfo = { type: 'misc'; name: 'interrupt' }

/** @public */
export type TLEventInfo =
	| TLPointerEventInfo
	| TLClickEventInfo
	| TLKeyboardEventInfo
	| TLPinchEventInfo
	| TLWheelEventInfo
	| TLCancelEventInfo
	| TLCompleteEventInfo
	| TLInterruptEventInfo

/** @public */
export type TLPointerEvent = (info: TLPointerEventInfo) => void
/** @public */
export type TLClickEvent = (info: TLClickEventInfo) => void
/** @public */
export type TLKeyboardEvent = (info: TLKeyboardEventInfo) => void
/** @public */
export type TLPinchEvent = (info: TLPinchEventInfo) => void
/** @public */
export type TLWheelEvent = (info: TLWheelEventInfo) => void
/** @public */
export type TLCancelEvent = (info: TLCancelEventInfo) => void
/** @public */
export type TLCompleteEvent = (info: TLCompleteEventInfo) => void
/** @public */
export type TLInterruptEvent = (info: TLInterruptEventInfo) => void

/** @public */
export type UiEvent =
	| TLPointerEvent
	| TLClickEvent
	| TLKeyboardEvent
	| TLPinchEvent
	| TLCancelEvent
	| TLCompleteEvent

/** @public */
export type TLEnterEventHandler = (info: any, from: string) => void
/** @public */
export type TLExitEventHandler = (info: any, to: string) => void

/** @public */
export interface TLEventHandlers {
	onPointerDown: TLPointerEvent
	onPointerMove: TLPointerEvent
	onRightClick: TLPointerEvent
	onDoubleClick: TLClickEvent
	onTripleClick: TLClickEvent
	onQuadrupleClick: TLClickEvent
	onMiddleClick: TLPointerEvent
	onPointerUp: TLPointerEvent
	onKeyDown: TLKeyboardEvent
	onKeyUp: TLKeyboardEvent
	onKeyRepeat: TLKeyboardEvent
	onWheel: TLWheelEvent
	onCancel: TLCancelEvent
	onComplete: TLCompleteEvent
	onInterrupt: TLInterruptEvent
}

/** @public */
export const EVENT_NAME_MAP: Record<
	Exclude<TLEventName, TLPinchEventName>,
	keyof TLEventHandlers
> = {
	wheel: 'onWheel',
	pointer_down: 'onPointerDown',
	pointer_move: 'onPointerMove',
	pointer_up: 'onPointerUp',
	right_click: 'onRightClick',
	middle_click: 'onMiddleClick',
	key_down: 'onKeyDown',
	key_up: 'onKeyUp',
	key_repeat: 'onKeyRepeat',
	cancel: 'onCancel',
	complete: 'onComplete',
	interrupt: 'onInterrupt',
	double_click: 'onDoubleClick',
	triple_click: 'onTripleClick',
	quadruple_click: 'onQuadrupleClick',
}

/** @public */
export type TLTickEvent = (elapsed: number) => void
