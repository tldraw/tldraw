import {
	Geometry2d,
	HIT_TEST_MARGIN,
	StateNode,
	TLEventHandlers,
	TLFrameShape,
	TLGroupShape,
	TLShape,
	TLShapeId,
	Vec2d,
	intersectLineSegmentPolyline,
	pointInPolygon,
} from '@tldraw/editor'

export class ScribbleBrushing extends StateNode {
	static override id = 'scribble_brushing'

	hits = new Set<TLShapeId>()

	size = 0

	scribbleId = 'id'

	initialSelectedShapeIds = new Set<TLShapeId>()
	newlySelectedShapeIds = new Set<TLShapeId>()

	override onEnter = () => {
		this.initialSelectedShapeIds = new Set<TLShapeId>(
			this.editor.inputs.shiftKey ? this.editor.getSelectedShapeIds() : []
		)
		this.newlySelectedShapeIds = new Set<TLShapeId>()
		this.size = 0
		this.hits.clear()

		const scribbleItem = this.editor.scribbles.addScribble({
			color: 'selection-stroke',
			opacity: 0.32,
			size: 12,
		})

		this.scribbleId = scribbleItem.id

		this.updateScribbleSelection(true)

		requestAnimationFrame(() => {
			this.editor.updateInstanceState({ brush: null })
		})
	}

	override onExit = () => {
		this.editor.scribbles.stop(this.scribbleId)
	}

	override onPointerMove = () => {
		this.updateScribbleSelection(true)
	}

	override onPointerUp = () => {
		this.complete()
	}

	override onKeyDown = () => {
		this.updateScribbleSelection(false)
	}

	override onKeyUp = () => {
		if (!this.editor.inputs.altKey) {
			this.parent.transition('brushing')
		} else {
			this.updateScribbleSelection(false)
		}
	}

	override onCancel: TLEventHandlers['onCancel'] = () => {
		this.cancel()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.complete()
	}

	private pushPointToScribble = () => {
		const { x, y } = this.editor.inputs.currentPagePoint
		this.editor.scribbles.addPoint(this.scribbleId, x, y)
	}

	private updateScribbleSelection(addPoint: boolean) {
		const zoomLevel = this.editor.getZoomLevel()
		const currentPageShapes = this.editor.getCurrentPageShapes()
		const {
			inputs: { shiftKey, originPagePoint, previousPagePoint, currentPagePoint },
		} = this.editor

		const { newlySelectedShapeIds, initialSelectedShapeIds } = this

		if (addPoint) {
			this.pushPointToScribble()
		}

		const shapes = currentPageShapes
		let shape: TLShape, geometry: Geometry2d, A: Vec2d, B: Vec2d

		for (let i = 0, n = shapes.length; i < n; i++) {
			shape = shapes[i]
			geometry = this.editor.getShapeGeometry(shape)

			// If the shape is a group or is already selected or locked, don't select it
			if (
				this.editor.isShapeOfType<TLGroupShape>(shape, 'group') ||
				newlySelectedShapeIds.has(shape.id) ||
				this.editor.isShapeOrAncestorLocked(shape)
			) {
				continue
			}

			// If the scribble started inside of the frame, don't select it
			if (this.editor.isShapeOfType<TLFrameShape>(shape, 'frame')) {
				const point = this.editor.getPointInShapeSpace(shape, originPagePoint)
				if (geometry.bounds.containsPoint(point)) {
					continue
				}
			}

			A = this.editor.getPointInShapeSpace(shape, previousPagePoint)
			B = this.editor.getPointInShapeSpace(shape, currentPagePoint)
			if (geometry.hitTestLineSegment(A, B, HIT_TEST_MARGIN / zoomLevel)) {
				const outermostShape = this.editor.getOutermostSelectableShape(shape)

				const pageMask = this.editor.getShapeMask(outermostShape.id)

				if (pageMask) {
					const intersection = intersectLineSegmentPolyline(
						previousPagePoint,
						currentPagePoint,
						pageMask
					)
					if (intersection !== null) {
						const isInMask = pointInPolygon(currentPagePoint, pageMask)
						if (!isInMask) continue
					}
				}

				newlySelectedShapeIds.add(outermostShape.id)
			}
		}

		this.editor.setSelectedShapes(
			[
				...new Set<TLShapeId>(
					shiftKey
						? [...newlySelectedShapeIds, ...initialSelectedShapeIds]
						: [...newlySelectedShapeIds]
				),
			],
			{ squashing: true }
		)
	}

	private complete() {
		this.parent.transition('idle')
	}

	private cancel() {
		this.editor.setSelectedShapes([...this.initialSelectedShapeIds], { squashing: true })
		this.parent.transition('idle')
	}
}
