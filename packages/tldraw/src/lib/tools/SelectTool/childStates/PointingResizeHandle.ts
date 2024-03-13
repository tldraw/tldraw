import { StateNode, TLEventHandlers, TLPointerEventInfo } from '@tldraw/editor'
import { CursorTypeMap } from '../select-helpers'

type PointingResizeHandleInfo = Extract<TLPointerEventInfo, { target: 'selection' }>

export class PointingResizeHandle extends StateNode {
	static override id = 'pointing_resize_handle'

	private info = {} as PointingResizeHandleInfo

	private updateCursor() {
		const selected = this.editor.getSelectedShapes()
		this.editor.setCursor({
			type: CursorTypeMap[this.info.handle!],
			rotation: selected.length === 1 ? selected[0].rotation : 0,
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
		this.parent.transition('idle')
	}

	private cancel() {
		this.parent.transition('idle')
	}
}
