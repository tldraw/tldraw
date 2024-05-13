import { TLCursorType, TLSelectionHandle } from 'tldraw'

export const cursorTypeMap: Record<TLSelectionHandle, TLCursorType> = {
	bottom: 'ns-resize',
	top: 'ns-resize',
	left: 'ew-resize',
	right: 'ew-resize',
	bottom_left: 'nesw-resize',
	bottom_right: 'nwse-resize',
	top_left: 'nwse-resize',
	top_right: 'nesw-resize',
	bottom_left_rotate: 'swne-rotate',
	bottom_right_rotate: 'senw-rotate',
	top_left_rotate: 'nwse-rotate',
	top_right_rotate: 'nesw-rotate',
	mobile_rotate: 'grabbing',
}
