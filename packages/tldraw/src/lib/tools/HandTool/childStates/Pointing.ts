import { StateNode } from '@tldraw/editor'

export class Pointing extends StateNode {
	static override id = 'pointing'

	override onEnter() {
		this.editor.stopCameraAnimation()
		this.editor.setCursor({ type: 'grabbing', rotation: 0 })
	}

	override onLongPress() {
		this.startDragging()
	}

	override onPointerMove() {
		if (this.editor.inputs.isDragging) {
			this.startDragging()
		}
	}

	private startDragging() {
		this.parent.transition('dragging')
	}

	override onPointerUp() {
		this.complete()
	}

	override onCancel() {
		this.complete()
	}

	override onComplete() {
		this.complete()
	}

	override onInterrupt() {
		this.complete()
	}

	private complete() {
		this.parent.transition('idle')
	}
}
