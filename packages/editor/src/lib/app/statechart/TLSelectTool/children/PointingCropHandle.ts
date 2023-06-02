import { TLShape } from '@tldraw/tlschema'
import { TLEventHandlers, TLPointerEventInfo } from '../../../types/event-types'
import { StateNode } from '../../StateNode'
import { CursorTypeMap } from './PointingResizeHandle'

type TLPointingCropHandleInfo = Extract<
	TLPointerEventInfo,
	{
		target: 'selection'
	}
> & {
	onInteractionEnd?: string
}

export class PointingCropHandle extends StateNode {
	static override id = 'pointing_crop_handle'

	private info = {} as TLPointingCropHandleInfo

	private updateCursor(shape: TLShape) {
		const cursorType = CursorTypeMap[this.info.handle!]
		this.editor.setCursor({
			type: cursorType,
			rotation: shape.rotation,
		})
	}

	override onEnter = (info: TLPointingCropHandleInfo) => {
		this.info = info
		const selectedShape = this.editor.selectedShapes[0]
		if (!selectedShape) return

		this.updateCursor(selectedShape)
		this.editor.setCroppingId(selectedShape.id)
	}

	override onPointerMove: TLEventHandlers['onPointerMove'] = () => {
		const isDragging = this.editor.inputs.isDragging

		if (isDragging) {
			this.parent.transition('cropping', {
				...this.info,
				onInteractionEnd: this.info.onInteractionEnd,
			})
		}
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		if (this.info.onInteractionEnd) {
			this.editor.setSelectedTool(this.info.onInteractionEnd, this.info)
		} else {
			this.editor.setCroppingId(null)
			this.parent.transition('idle', {})
		}
	}

	override onCancel: TLEventHandlers['onCancel'] = () => {
		this.cancel()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.cancel()
	}

	override onInterrupt = () => {
		this.cancel()
	}

	private cancel() {
		if (this.info.onInteractionEnd) {
			this.editor.setSelectedTool(this.info.onInteractionEnd, this.info)
		} else {
			this.editor.setCroppingId(null)
			this.parent.transition('idle', {})
		}
	}
}
