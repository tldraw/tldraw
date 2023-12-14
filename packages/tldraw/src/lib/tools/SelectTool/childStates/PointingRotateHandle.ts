import { RotateCorner, StateNode, TLEventHandlers, TLPointerEventInfo } from '@tldraw/editor'
import { CursorTypeMap } from './PointingResizeHandle'

type PointingRotateHandleInfo = Extract<TLPointerEventInfo, { target: 'selection' }> & {
	onInteractionEnd?: string
}

export class PointingRotateHandle extends StateNode {
	static override id = 'pointing_rotate_handle'

	private info = {} as PointingRotateHandleInfo

	private updateCursor() {
		const selectionRotation = this.editor.getSelectionRotation()
		this.editor.updateInstanceState({
			cursor: {
				type: CursorTypeMap[this.info.handle as RotateCorner],
				rotation: selectionRotation,
			},
		})
	}

	override onEnter = (info: PointingRotateHandleInfo) => {
		this.parent.setCurrentToolIdMask(info.onInteractionEnd)
		this.info = info
		this.updateCursor()
	}

	override onExit = () => {
		this.parent.setCurrentToolIdMask(undefined)
		this.editor.updateInstanceState(
			{ cursor: { type: 'default', rotation: 0 } },
			{ ephemeral: true }
		)
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
