import { TLShapeId } from '@tldraw/tlschema'
import { TLEventHandlers } from '../../../types/event-types'
import { StateNode } from '../../StateNode'

export class Pointing extends StateNode {
	static override id = 'pointing'

	onEnter = () => {
		const { inputs } = this.app

		const erasing = new Set<TLShapeId>()

		const initialSize = erasing.size

		for (const shape of [...this.app.sortedShapesArray].reverse()) {
			if (this.app.isPointInShape(inputs.currentPagePoint, shape)) {
				// Skip groups
				if (shape.type === 'group') continue

				const hitShape = this.app.getOutermostSelectableShape(shape)

				// If we've hit a frame after hitting any other shape, stop here
				if (hitShape.type === 'frame' && erasing.size > initialSize) break

				erasing.add(hitShape.id)
			}
		}

		this.app.setErasingIds([...erasing])
	}

	onPointerMove: TLEventHandlers['onPointerMove'] = (info) => {
		if (this.app.inputs.isDragging) {
			this.parent.transition('erasing', info)
		}
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.complete()
	}

	override onCancel: TLEventHandlers['onCancel'] = () => {
		this.cancel()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.complete()
	}

	override onInterrupt: TLEventHandlers['onInterrupt'] = () => {
		this.cancel()
	}

	complete() {
		const { erasingIds } = this.app

		if (erasingIds.length) {
			this.app.mark('erase end')
			this.app.deleteShapes(erasingIds)
		}

		this.app.setErasingIds([])
		this.parent.transition('idle', {})
	}

	cancel() {
		this.app.setErasingIds([])
		this.parent.transition('idle', {})
	}
}
