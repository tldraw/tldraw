import { StateNode, TLEventHandlers, TLFrameShape, TLGroupShape, TLShapeId } from '@tldraw/editor'

export class Pointing extends StateNode {
	static override id = 'pointing'

	override onEnter = () => {
		const { inputs } = this.editor

		const erasing = new Set<TLShapeId>()

		const initialSize = erasing.size

		for (const shape of [...this.editor.sortedShapesArray].reverse()) {
			if (this.editor.isPointInShape(shape, inputs.currentPagePoint, true, true)) {
				// Skip groups
				if (this.editor.isShapeOfType<TLGroupShape>(shape, 'group')) continue

				const hitShape = this.editor.getOutermostSelectableShape(shape)

				// If we've hit a frame after hitting any other shape, stop here
				if (
					this.editor.isShapeOfType<TLFrameShape>(hitShape, 'frame') &&
					erasing.size > initialSize
				)
					break

				erasing.add(hitShape.id)
			}
		}

		this.editor.setErasingIds([...erasing])
	}

	override onPointerMove: TLEventHandlers['onPointerMove'] = (info) => {
		if (this.editor.inputs.isDragging) {
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
		const { erasingIds } = this.editor

		if (erasingIds.length) {
			this.editor.mark('erase end')
			this.editor.deleteShapes(erasingIds)
		}

		this.editor.setErasingIds([])
		this.parent.transition('idle', {})
	}

	cancel() {
		this.editor.setErasingIds([])
		this.parent.transition('idle', {})
	}
}
