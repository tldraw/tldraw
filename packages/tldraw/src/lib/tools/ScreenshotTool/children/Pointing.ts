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
			this.parent.transition('dragging', this.info)
		}
	}

	override onCancel: TLEventHandlers['onCancel'] = () => {
		this.cancel()
	}

	private complete() {
		this.parent.transition('idle', this.info)
	}

	private cancel() {
		this.parent.transition('idle', this.info)
	}
}
