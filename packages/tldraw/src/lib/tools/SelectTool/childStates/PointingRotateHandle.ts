import { RotateCorner, StateNode, TLClickEventInfo, TLPointerEventInfo } from '@tldraw/editor'
import { CursorTypeMap } from './PointingResizeHandle'

type PointingRotateHandleInfo = Extract<TLPointerEventInfo, { target: 'selection' }> & {
	onInteractionEnd?: string | (() => void)
}

export class PointingRotateHandle extends StateNode {
	static override id = 'pointing_rotate_handle'

	private info = {} as PointingRotateHandleInfo

	override onEnter(info: PointingRotateHandleInfo) {
		this.info = info
		if (typeof info.onInteractionEnd === 'string') {
			this.parent.setCurrentToolIdMask(info.onInteractionEnd)
		}
		this.editor.setCursor({
			type: CursorTypeMap[info.handle as RotateCorner],
			rotation: this.editor.getSelectionRotation(),
		})
	}

	override onExit() {
		this.parent.setCurrentToolIdMask(undefined)
		this.editor.setCursor({ type: 'default', rotation: 0 })
	}

	override onPointerMove() {
		if (this.editor.inputs.getIsDragging()) {
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
		this.exitToPreviousTool()
	}

	override onDoubleClick(info: TLClickEventInfo) {
		if (
			this.editor.inputs.getShiftKey() ||
			info.phase !== 'down' ||
			info.ctrlKey ||
			info.shiftKey
		) {
			return
		}

		this.parent.transition('idle')
		this.parent.getCurrent()?.handleEvent(info)
	}

	override onCancel() {
		this.exitToPreviousTool()
	}

	override onComplete() {
		this.exitToPreviousTool()
	}

	override onInterrupt() {
		this.exitToPreviousTool()
	}

	private exitToPreviousTool() {
		const { onInteractionEnd } = this.info
		if (onInteractionEnd) {
			if (typeof onInteractionEnd === 'string') {
				// Return to the tool that was active before this one, whether tool lock is turned on or not!
				this.editor.setCurrentTool(onInteractionEnd, {})
			} else {
				onInteractionEnd()
			}
			return
		}
		this.parent.transition('idle')
	}
}
