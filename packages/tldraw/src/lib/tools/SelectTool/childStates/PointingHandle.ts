import { StateNode, TLArrowShape, TLEventHandlers, TLPointerEventInfo, getArrowBindings } from '@tldraw/editor'

export class PointingHandle extends StateNode {
	static override id = 'pointing_handle'

	info = {} as TLPointerEventInfo & { target: 'handle' }

	override onEnter = (info: TLPointerEventInfo & { target: 'handle' }) => {
		this.info = info

		const {startBinding, endBinding} = getArrowBindings(this.editor, info.shape as TLArrowShape)
		const initialBinding = info.handle.id === 'start' ? startBinding : endBinding

		if (initialBinding) {
			this.editor.setHintingShapes([initialBinding.toShapeId])
		}

		this.editor.updateInstanceState(
			{ cursor: { type: 'grabbing', rotation: 0 } },
			{ ephemeral: true }
		)
	}

	override onExit = () => {
		this.editor.setHintingShapes([])
		this.editor.updateInstanceState(
			{ cursor: { type: 'default', rotation: 0 } },
			{ ephemeral: true }
		)
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.parent.transition('idle', this.info)
	}

	override onPointerMove: TLEventHandlers['onPointerMove'] = () => {
		if (this.editor.inputs.isDragging) {
			this.parent.transition('dragging_handle', this.info)
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
		this.parent.transition('idle')
	}
}
