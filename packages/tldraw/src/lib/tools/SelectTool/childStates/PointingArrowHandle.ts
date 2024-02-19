import { StateNode, TLArrowShape, TLEventHandlers, TLPointerEventInfo } from '@tldraw/editor'

export class PointingArrowHandle extends StateNode {
	static override id = 'pointing_arrow_handle'

	info = {} as TLPointerEventInfo & { shape: TLArrowShape; target: 'handle' }

	override onEnter = (info: TLPointerEventInfo & { shape: TLArrowShape; target: 'handle' }) => {
		this.info = info

		const { shape } = info

		const initialTerminal = shape.props[info.handle.id as 'start' | 'end']

		if (initialTerminal?.type === 'binding') {
			this.editor.setHintingShapes([initialTerminal.boundShapeId])
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
			this.parent.transition('dragging_arrow_handle', this.info)
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
