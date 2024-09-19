import { Box, StateNode, TLPointerEventInfo } from '@tldraw/editor'

export class ZoomBrushing extends StateNode {
	static override id = 'zoom_brushing'

	info = {} as TLPointerEventInfo & { onInteractionEnd?: string }

	zoomBrush = new Box()

	override onEnter(info: TLPointerEventInfo & { onInteractionEnd: string }) {
		this.info = info
		this.update()
	}

	override onExit() {
		this.editor.updateInstanceState({ zoomBrush: null })
	}

	override onPointerMove() {
		this.update()
	}

	override onPointerUp() {
		this.complete()
	}

	override onCancel() {
		this.cancel()
	}

	private update() {
		const {
			inputs: { originPagePoint, currentPagePoint },
		} = this.editor

		this.zoomBrush.setTo(Box.FromPoints([originPagePoint, currentPagePoint]))
		this.editor.updateInstanceState({ zoomBrush: this.zoomBrush.toJson() })
	}

	private cancel() {
		this.parent.transition('idle', this.info)
	}

	private complete() {
		const { zoomBrush } = this
		const threshold = 8 / this.editor.getZoomLevel()
		// If the selected area is small then treat it as a click
		if (zoomBrush.width < threshold && zoomBrush.height < threshold) {
			const point = this.editor.inputs.currentScreenPoint
			if (this.editor.inputs.altKey) {
				this.editor.zoomOut(point, { animation: { duration: 220 } })
			} else {
				this.editor.zoomIn(point, { animation: { duration: 220 } })
			}
		} else {
			const targetZoom = this.editor.inputs.altKey ? this.editor.getZoomLevel() / 2 : undefined
			this.editor.zoomToBounds(zoomBrush, { targetZoom, animation: { duration: 220 } })
		}

		this.parent.transition('idle', this.info)
	}
}
