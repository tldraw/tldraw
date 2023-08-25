import {
	HIT_TEST_MARGIN,
	StateNode,
	TLEventHandlers,
	TLFrameShape,
	TLGroupShape,
	TLShapeId,
} from '@tldraw/editor'

export class Pointing extends StateNode {
	static override id = 'pointing'

	override onEnter = () => {
		const {
			inputs: { currentPagePoint },
			currentPageShapesSorted: sortedShapesOnCurrentPage,
			zoomLevel,
		} = this.editor

		const erasing = new Set<TLShapeId>()

		const initialSize = erasing.size

		for (let n = sortedShapesOnCurrentPage.length, i = n - 1; i >= 0; i--) {
			const shape = sortedShapesOnCurrentPage[i]
			if (this.editor.isShapeOfType<TLGroupShape>(shape, 'group')) {
				continue
			}

			if (
				this.editor.isPointInShape(shape, currentPagePoint, {
					hitInside: false,
					margin: HIT_TEST_MARGIN / zoomLevel,
				})
			) {
				const hitShape = this.editor.getOutermostSelectableShape(shape)
				// If we've hit a frame after hitting any other shape, stop here
				if (
					this.editor.isShapeOfType<TLFrameShape>(hitShape, 'frame') &&
					erasing.size > initialSize
				) {
					break
				}

				erasing.add(hitShape.id)
			}
		}

		this.editor.setErasingShapes([...erasing])
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
		const { erasingShapeIds } = this.editor

		if (erasingShapeIds.length) {
			this.editor.mark('erase end')
			this.editor.deleteShapes(erasingShapeIds)
		}

		this.editor.setErasingShapes([])
		this.parent.transition('idle', {})
	}

	cancel() {
		this.editor.setErasingShapes([])
		this.parent.transition('idle', {})
	}
}
