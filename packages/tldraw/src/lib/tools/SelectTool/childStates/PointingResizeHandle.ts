import { StateNode, TLCursorType, TLPointerEventInfo, TLSelectionHandle } from '@tldraw/editor'

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
	onInteractionEnd?: string | (() => void)
}

export class PointingResizeHandle extends StateNode {
	static override id = 'pointing_resize_handle'

	private info = {} as PointingResizeHandleInfo

	private updateCursor() {
		const selected = this.editor.getSelectedShapes()
		const cursorType = CursorTypeMap[this.info.handle!]
		this.editor.setCursor({
			type: cursorType,
			rotation: selected.length === 1 ? this.editor.getSelectionRotation() : 0,
		})
	}

	override onEnter(info: PointingResizeHandleInfo) {
		this.info = info
		if (typeof info.onInteractionEnd === 'string') {
			this.parent.setCurrentToolIdMask(info.onInteractionEnd)
		}
		this.updateCursor()
	}

	override onExit() {
		this.parent.setCurrentToolIdMask(undefined)
	}

	override onPointerMove() {
		if (this.editor.inputs.getIsDragging()) {
			this.startResizing()
		}
	}

	override onLongPress() {
		this.startResizing()
	}

	private startResizing() {
		if (this.editor.getIsReadonly()) return
		this.parent.transition('resizing', this.info)
	}

	override onPointerUp() {
		this.complete()
	}

	override onCancel() {
		this.cancel()
	}

	override onComplete() {
		this.cancel()
	}

	override onInterrupt() {
		this.cancel()
	}

	private complete() {
		const { onInteractionEnd } = this.info
		if (onInteractionEnd) {
			if (typeof onInteractionEnd === 'string') {
				this.editor.setCurrentTool(onInteractionEnd, {})
			} else {
				onInteractionEnd()
			}
			return
		}
		this.parent.transition('idle')
	}

	private cancel() {
		const { onInteractionEnd } = this.info
		if (onInteractionEnd) {
			if (typeof onInteractionEnd === 'string') {
				this.editor.setCurrentTool(onInteractionEnd, {})
			} else {
				onInteractionEnd()
			}
			return
		}
		this.parent.transition('idle')
	}
}
