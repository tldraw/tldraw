import { StateNode, TLEventHandlers, TLLineShape, TLPointerEventInfo } from '@tldraw/editor'

export class PointingLineHandle extends StateNode {
	static override id = 'pointing_line_handle'

	info = {} as TLPointerEventInfo & { shape: TLLineShape; target: 'handle' }

	override onEnter = (info: TLPointerEventInfo & { shape: TLLineShape; target: 'handle' }) => {
		this.info = info

		this.editor.updateInstanceState(
			{ cursor: { type: 'grabbing', rotation: 0 } },
			{ ephemeral: true }
		)
	}

	override onExit = () => {
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
			this.parent.transition('dragging_line_handle', this.info)
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
