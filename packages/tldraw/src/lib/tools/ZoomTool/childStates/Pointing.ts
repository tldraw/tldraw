import { StateNode, TLPointerEventInfo } from '@tldraw/editor'

export class Pointing extends StateNode {
	static override id = 'pointing'

	info = {} as TLPointerEventInfo & { onInteractionEnd?: string }

	override onEnter(info: TLPointerEventInfo & { onInteractionEnd: string }) {
		this.info = info
	}

	override onPointerUp() {
		this.complete()
	}

	override onPointerMove() {
		if (this.editor.inputs.isDragging) {
			this.parent.transition('zoom_brushing', this.info)
		}
	}

	override onCancel() {
		this.cancel()
	}

	private complete() {
		const { currentScreenPoint } = this.editor.inputs
		if (this.editor.inputs.altKey) {
			this.editor.zoomOut(currentScreenPoint, { animation: { duration: 220 } })
		} else {
			this.editor.zoomIn(currentScreenPoint, { animation: { duration: 220 } })
		}
		this.parent.transition('idle', this.info)
	}

	private cancel() {
		this.parent.transition('idle', this.info)
	}
}
