import { StateNode, TLEventHandlers, TLPointerEventInfo } from '@tldraw/editor'

export class Pointing extends StateNode {
	static override id = 'pointing'

	info = {} as TLPointerEventInfo & { onInteractionEnd?: string }

	override onEnter = (info: TLPointerEventInfo & { onInteractionEnd: string }) => {
		this.info = info
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.complete()
	}

	override onPointerMove: TLEventHandlers['onPointerUp'] = () => {
		if (this.editor.inputs.isDragging) {
			this.parent.transition('zoom_brushing', this.info)
		}
	}

	override onCancel: TLEventHandlers['onCancel'] = () => {
		this.cancel()
	}

	private complete() {
		const { currentScreenPoint } = this.editor.inputs
		if (this.editor.inputs.altKey) {
			this.editor.zoomOut(currentScreenPoint, { duration: 220 })
		} else {
			this.editor.zoomIn(currentScreenPoint, { duration: 220 })
		}
		this.parent.transition('idle', this.info)
	}

	private cancel() {
		this.parent.transition('idle', this.info)
	}
}
