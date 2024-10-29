import { StateNode, TLPointerEventInfo } from '@tldraw/editor'
import { CursorTypeMap } from '../../PointingResizeHandle'

type TLPointingCropHandleInfo = TLPointerEventInfo & {
	target: 'selection'
} & {
	onInteractionEnd?: string
}

export class PointingCropHandle extends StateNode {
	static override id = 'pointing_crop_handle'

	private info = {} as TLPointingCropHandleInfo

	override onEnter(info: TLPointingCropHandleInfo) {
		this.info = info
		this.parent.setCurrentToolIdMask(info.onInteractionEnd)
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
		if (this.editor.inputs.isDragging) {
			this.startCropping()
		}
	}

	override onLongPress() {
		this.startCropping()
	}

	private startCropping() {
		if (this.editor.getIsReadonly()) return
		this.parent.transition('cropping', {
			...this.info,
			onInteractionEnd: this.info.onInteractionEnd,
		})
	}

	override onPointerUp() {
		if (this.info.onInteractionEnd) {
			this.editor.setCurrentTool(this.info.onInteractionEnd, this.info)
		} else {
			this.editor.setCroppingShape(null)
			this.editor.setCurrentTool('select.idle')
		}
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

	private cancel() {
		if (this.info.onInteractionEnd) {
			this.editor.setCurrentTool(this.info.onInteractionEnd, this.info)
		} else {
			this.editor.setCroppingShape(null)
			this.editor.setCurrentTool('select.idle')
		}
	}
}
