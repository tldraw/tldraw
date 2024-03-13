import { StateNode, TLEventHandlers, TLPointerEventInfo } from '@tldraw/editor'

export class PointingHandle extends StateNode {
	static override id = 'pointing_handle'

	info = {} as TLPointerEventInfo & { target: 'handle' }

	override onEnter = (info: TLPointerEventInfo & { target: 'handle' }) => {
		this.info = info

		this.editor.setCursor({ type: 'grabbing', rotation: 0 })
	}

	override onExit = () => {
		this.editor.setCursor({ type: 'default', rotation: 0 })
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
