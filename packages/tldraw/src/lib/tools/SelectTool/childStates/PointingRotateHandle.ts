import { RotateCorner, StateNode, TLPointerEventInfo } from '@tldraw/editor'
import { CursorTypeMap } from './PointingResizeHandle'

type PointingRotateHandleInfo = Extract<TLPointerEventInfo, { target: 'selection' }> & {
	onInteractionEnd?: string
}

export class PointingRotateHandle extends StateNode {
	static override id = 'pointing_rotate_handle'

	private info = {} as PointingRotateHandleInfo

	private updateCursor() {
		this.editor.setCursor({
			type: CursorTypeMap[this.info.handle as RotateCorner],
			rotation: this.editor.getSelectionRotation(),
		})
	}

	override onEnter(info: PointingRotateHandleInfo) {
		this.parent.setCurrentToolIdMask(info.onInteractionEnd)
		this.info = info
		this.updateCursor()
	}

	override onExit() {
		this.parent.setCurrentToolIdMask(undefined)
		this.editor.setCursor({ type: 'default', rotation: 0 })
	}

	override onPointerMove() {
		if (this.editor.inputs.isDragging) {
			this.startRotating()
		}
	}

	override onLongPress() {
		this.startRotating()
	}

	private startRotating() {
		if (this.editor.getIsReadonly()) return
		this.parent.transition('rotating', this.info)
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
