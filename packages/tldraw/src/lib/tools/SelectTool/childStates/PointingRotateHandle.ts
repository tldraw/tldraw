import { RotateCorner, StateNode, TLPointerEventInfo } from '@tldraw/editor'
import { CursorTypeMap } from '../select-helpers'

type PointingRotateHandleInfo = Extract<TLPointerEventInfo, { target: 'selection' }> & {
	handle: RotateCorner
}

export class PointingRotateHandle extends StateNode {
	static override id = 'pointing_rotate_handle'

	private info = {} as PointingRotateHandleInfo

	override onEnter = (info: PointingRotateHandleInfo) => {
		this.info = info
		const selectionRotation = this.editor.getSelectionRotation()
		this.editor.setCursor({
			type: CursorTypeMap[this.info.handle],
			rotation: selectionRotation,
		})
	}

	override onExit = () => {
		this.editor.setCursor({ type: 'default', rotation: 0 })
	}

	override onPointerMove = () => {
		const { isDragging } = this.editor.inputs

		if (isDragging) {
			this.parent.transition('rotating', this.info)
		}
	}

	override onPointerUp = () => {
		this.complete()
	}

	override onCancel = () => {
		this.complete()
	}

	override onComplete = () => {
		this.complete()
	}

	override onInterrupt = () => {
		this.complete()
	}

	private complete() {
		this.parent.transition('idle')
	}
}
