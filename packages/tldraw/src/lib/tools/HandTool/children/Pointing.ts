import { StateNode, TLEventHandlers } from '@tldraw/editor'

export class Pointing extends StateNode {
	static override id = 'pointing'

	override onEnter = () => {
		this.editor.stopCameraAnimation()
		this.editor.updateInstanceState(
			{ cursor: { type: 'grabbing', rotation: 0 } },
			{ ephemeral: true }
		)
	}

	override onPointerMove: TLEventHandlers['onPointerMove'] = (info) => {
		if (this.editor.inputs.isDragging) {
			this.parent.transition('dragging', info)
		}
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.complete()
	}

	override onCancel: TLEventHandlers['onCancel'] = () => {
		this.complete()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.complete()
	}

	override onInterrupt: TLEventHandlers['onInterrupt'] = () => {
		this.complete()
	}

	private complete() {
		this.parent.transition('idle', {})
	}
}
