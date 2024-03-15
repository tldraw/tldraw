import { Box, Interaction } from '@tldraw/editor'

export class ZoomBrushingInteraction extends Interaction {
	id = 'zoom-brushing'

	zoomBrush = new Box()

	override onUpdate() {
		const { zoomBrush, editor } = this
		const {
			inputs: { originPagePoint, currentPagePoint },
		} = editor

		if (!editor.inputs.isPointing) {
			this.complete()
			return
		}

		zoomBrush.setTo(Box.FromPoints([originPagePoint, currentPagePoint]))
		editor.updateInstanceState({ zoomBrush: zoomBrush.toJson() })
	}

	override onComplete(): void {
		const { zoomBrush, editor } = this
		const threshold = 8 / this.editor.getZoomLevel()
		// If the selected area is small then treat it as a click
		if (zoomBrush.width < threshold && zoomBrush.height < threshold) {
			const point = editor.inputs.currentScreenPoint
			if (editor.inputs.altKey) {
				// Alt + drag zooms out
				editor.zoomOut(point, { duration: 220 })
			} else {
				editor.zoomIn(point, { duration: 220 })
			}
		} else {
			const targetZoom = editor.inputs.altKey ? editor.getZoomLevel() / 2 : undefined
			editor.zoomToBounds(zoomBrush, { targetZoom, duration: 220 })
		}
	}

	override onEnd() {
		this.editor.updateInstanceState({ zoomBrush: null })
	}
}
