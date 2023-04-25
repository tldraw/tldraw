import { Box2d } from '@tldraw/primitives'
import { TLEventHandlers, TLPointerEventInfo } from '../../../types/event-types'
import { StateNode } from '../../StateNode'

export class ZoomBrushing extends StateNode {
	static override id = 'zoom_brushing'

	info = {} as TLPointerEventInfo & { onInteractionEnd?: string }

	zoomBrush = new Box2d()

	onEnter = (info: TLPointerEventInfo & { onInteractionEnd: string }) => {
		this.info = info
		this.update()
	}

	onExit = () => {
		this.app.setZoomBrush(null)
	}

	onPointerMove = () => {
		this.update()
	}

	onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.complete()
	}

	onCancel: TLEventHandlers['onCancel'] = () => {
		this.cancel()
	}

	private update() {
		const {
			inputs: { originPagePoint, currentPagePoint },
		} = this.app

		this.zoomBrush.setTo(Box2d.FromPoints([originPagePoint, currentPagePoint]))
		this.app.setZoomBrush(this.zoomBrush.toJson())
	}

	private cancel() {
		this.parent.transition('idle', this.info)
	}

	private complete() {
		const { zoomBrush } = this
		const threshold = 8 / this.app.zoomLevel
		// If the selected area is small then treat it as a click
		if (zoomBrush.width < threshold && zoomBrush.height < threshold) {
			const point = this.app.inputs.currentScreenPoint
			if (this.app.inputs.altKey) {
				this.app.zoomOut(point, { duration: 220 })
			} else {
				this.app.zoomIn(point, { duration: 220 })
			}
		} else {
			const zoomLevel = this.app.inputs.altKey ? this.app.zoomLevel / 2 : undefined
			this.app.zoomToBounds(
				zoomBrush.x,
				zoomBrush.y,
				zoomBrush.width,
				zoomBrush.height,
				zoomLevel,
				{ duration: 220 }
			)
		}

		this.parent.transition('idle', this.info)
	}
}
