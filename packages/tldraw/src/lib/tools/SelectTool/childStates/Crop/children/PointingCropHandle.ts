import { StateNode, TLClickEventInfo, TLPointerEventInfo } from '@tldraw/editor'
import { returnToInteractionEnd } from '../../../selectHelpers'
import { CursorTypeMap } from '../../PointingResizeHandle'

type TLPointingCropHandleInfo = TLPointerEventInfo & {
	target: 'selection'
	onInteractionEnd?: string | (() => void)
}

export class PointingCropHandle extends StateNode {
	static override id = 'pointing_crop_handle'

	private info = {} as TLPointingCropHandleInfo

	override onEnter(info: TLPointingCropHandleInfo) {
		this.info = info
		if (typeof info.onInteractionEnd === 'string') {
			this.parent.setCurrentToolIdMask(info.onInteractionEnd)
		}
		const selectedShape = this.editor.getSelectedShapes()[0]
		if (!selectedShape) return

		const cursorType = CursorTypeMap[this.info.handle!]
		this.editor.setCursor({ type: cursorType, rotation: this.editor.getSelectionRotation() })
		this.editor.setCroppingShape(selectedShape.id)
	}

	override onExit() {
		this.editor.setCursor({ type: 'default', rotation: 0 })
		this.parent.setCurrentToolIdMask(undefined)
	}

	override onPointerMove() {
		if (this.editor.inputs.getIsDragging()) {
			this.startCropping()
		}
	}

	override onLongPress() {
		this.startCropping()
	}

	private startCropping() {
		if (this.editor.getIsReadonly()) return
		this.parent.transition('cropping', this.info)
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
		if (returnToInteractionEnd(this.editor, this.info.onInteractionEnd, this.info)) return
		this.editor.setCroppingShape(null)
		this.editor.setCurrentTool('select.idle')
	}
}
