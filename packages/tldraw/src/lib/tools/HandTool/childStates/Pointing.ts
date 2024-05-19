import { StateNode, TLEventHandlers } from '@tldraw/editor'

export class Pointing extends StateNode {
	static override id = 'pointing'

	override onEnter = () => {
		this.editor.stopCameraAnimation()
		this.editor.setCursor({ type: 'grabbing', rotation: 0 })
	}

	override onLongPress: TLEventHandlers['onLongPress'] = () => {
		this.startDragging()
	}

	override onPointerMove: TLEventHandlers['onPointerMove'] = () => {
		if (this.editor.inputs.isDragging) {
			this.startDragging()
		}
	}

	private startDragging() {
		this.parent.transition('dragging')
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
		this.parent.transition('idle')
	}
}
