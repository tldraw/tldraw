import { StateNode, TLClickEventInfo } from '@tldraw/editor'

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
		if (this.editor.inputs.getIsDragging()) {
			this.startDragging()
		}
	}

	override onDoubleClick(info: TLClickEventInfo) {
		if (info.phase === 'down' && this.editor.getInstanceState().isCoarsePointer) {
			this.parent.transition('one_finger_zooming', info)
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
