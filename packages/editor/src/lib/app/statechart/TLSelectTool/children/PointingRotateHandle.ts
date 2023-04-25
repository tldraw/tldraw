import { RotateCorner } from '@tldraw/primitives'
import { TLEventHandlers, TLPointerEventInfo } from '../../../types/event-types'
import { StateNode } from '../../StateNode'
import { CursorTypeMap } from './PointingResizeHandle'

type PointingRotateHandleInfo = Extract<TLPointerEventInfo, { target: 'selection' }> & {
	onInteractionEnd?: string
}

export class PointingRotateHandle extends StateNode {
	static override id = 'pointing_rotate_handle'

	private info = {} as PointingRotateHandleInfo

	private updateCursor() {
		const { selectionRotation } = this.app
		this.app.setCursor({
			type: CursorTypeMap[this.info.handle as RotateCorner],
			rotation: selectionRotation,
		})
	}

	override onEnter = (info: PointingRotateHandleInfo) => {
		this.info = info
		this.updateCursor()
	}

	override onPointerMove = () => {
		const { isDragging } = this.app.inputs

		if (isDragging) {
			this.parent.transition('rotating', this.info)
		}
	}

	override onPointerUp = () => {
		this.complete()
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

	private complete() {
		if (this.info.onInteractionEnd) {
			this.app.setSelectedTool(this.info.onInteractionEnd, {})
		} else {
			this.parent.transition('idle', {})
		}
	}

	private cancel() {
		if (this.info.onInteractionEnd) {
			this.app.setSelectedTool(this.info.onInteractionEnd, {})
		} else {
			this.parent.transition('idle', {})
		}
	}
}
