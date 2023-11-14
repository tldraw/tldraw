import {
	StateNode,
	TLCursorType,
	TLEventHandlers,
	TLPointerEventInfo,
	TLSelectionHandle,
} from '@tldraw/editor'

export const CursorTypeMap: Record<TLSelectionHandle, TLCursorType> = {
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

type PointingResizeHandleInfo = Extract<TLPointerEventInfo, { target: 'selection' }> & {
	onInteractionEnd?: string
}

export class PointingResizeHandle extends StateNode {
	static override id = 'pointing_resize_handle'

	private info = {} as PointingResizeHandleInfo

	private updateCursor() {
		const selected = this.editor.getSelectedShapes()
		const cursorType = CursorTypeMap[this.info.handle!]
		this.editor.updateInstanceState({
			cursor: { type: cursorType, rotation: selected.length === 1 ? selected[0].rotation : 0 },
		})
	}

	override onEnter = (info: PointingResizeHandleInfo) => {
		this.info = info
		this.updateCursor()
	}

	override onPointerMove: TLEventHandlers['onPointerMove'] = () => {
		const isDragging = this.editor.inputs.isDragging

		if (isDragging) {
			this.parent.transition('resizing', this.info)
		}
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.complete()
	}

	// override onPinchStart: TLEventHandlers['onPinchStart'] = (info) => {
	// 	this.parent.transition('pinching', info)
	// }

	override onCancel: TLEventHandlers['onCancel'] = () => {
		this.cancel()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.cancel()
	}

	override onInterrupt = () => {
		this.cancel()
	}

	private complete() {
		if (this.info.onInteractionEnd) {
			this.editor.setCurrentTool(this.info.onInteractionEnd, {})
		} else {
			this.parent.transition('idle')
		}
	}

	private cancel() {
		if (this.info.onInteractionEnd) {
			this.editor.setCurrentTool(this.info.onInteractionEnd, {})
		} else {
			this.parent.transition('idle')
		}
	}
}
