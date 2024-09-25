import {
	Geometry2d,
	StateNode,
	TLFrameShape,
	TLGroupShape,
	TLShape,
	TLShapeId,
	Vec,
	intersectLineSegmentPolygon,
	pointInPolygon,
} from '@tldraw/editor'

export class ScribbleBrushing extends StateNode {
	static override id = 'scribble_brushing'

	hits = new Set<TLShapeId>()

	size = 0

	scribbleId = 'id'

	initialSelectedShapeIds = new Set<TLShapeId>()
	newlySelectedShapeIds = new Set<TLShapeId>()

	override onEnter() {
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

		this.editor.updateInstanceState({ brush: null })
	}

	override onExit() {
		this.editor.scribbles.stop(this.scribbleId)
	}

	override onPointerMove() {
		this.updateScribbleSelection(true)
	}

	override onPointerUp() {
		this.complete()
	}

	override onKeyDown() {
		this.updateScribbleSelection(false)
	}

	override onKeyUp() {
		if (!this.editor.inputs.altKey) {
			this.parent.transition('brushing')
		} else {
			this.updateScribbleSelection(false)
		}
	}

	override onCancel() {
		this.cancel()
	}

	override onComplete() {
		this.complete()
	}

	private pushPointToScribble() {
		const { x, y } = this.editor.inputs.currentPagePoint
		this.editor.scribbles.addPoint(this.scribbleId, x, y)
	}

	private updateScribbleSelection(addPoint: boolean) {
		const { editor } = this
		// const zoomLevel = this.editor.getZoomLevel()
		const currentPageShapes = this.editor.getCurrentPageRenderingShapesSorted()
		const {
			inputs: { shiftKey, originPagePoint, previousPagePoint, currentPagePoint },
		} = this.editor

		const { newlySelectedShapeIds, initialSelectedShapeIds } = this

		if (addPoint) {
			this.pushPointToScribble()
		}

		const shapes = currentPageShapes
		let shape: TLShape, geometry: Geometry2d, A: Vec, B: Vec

		const minDist = 0 // this.editor.options.hitTestMargin / zoomLevel

		for (let i = 0, n = shapes.length; i < n; i++) {
			shape = shapes[i]

			// If the shape is a group or is already selected or locked, don't select it
			if (
				editor.isShapeOfType<TLGroupShape>(shape, 'group') ||
				newlySelectedShapeIds.has(shape.id) ||
				editor.isShapeOrAncestorLocked(shape)
			) {
				continue
			}

			geometry = editor.getShapeGeometry(shape)

			// If the scribble started inside of the frame, don't select it
			if (
				editor.isShapeOfType<TLFrameShape>(shape, 'frame') &&
				geometry.bounds.containsPoint(editor.getPointInShapeSpace(shape, originPagePoint))
			) {
				continue
			}

			// Hit test the shape using a line segment
			const pageTransform = editor.getShapePageTransform(shape)
			if (!geometry || !pageTransform) continue
			const pt = pageTransform.clone().invert()
			A = pt.applyToPoint(previousPagePoint)
			B = pt.applyToPoint(currentPagePoint)

			// If the line segment is entirely above / below / left / right of the shape's bounding box, skip the hit test
			const { bounds } = geometry
			if (
				bounds.minX - minDist > Math.max(A.x, B.x) ||
				bounds.minY - minDist > Math.max(A.y, B.y) ||
				bounds.maxX + minDist < Math.min(A.x, B.x) ||
				bounds.maxY + minDist < Math.min(A.y, B.y)
			) {
				continue
			}

			if (geometry.hitTestLineSegment(A, B, minDist)) {
				const outermostShape = this.editor.getOutermostSelectableShape(shape)
				const pageMask = this.editor.getShapeMask(outermostShape.id)
				if (pageMask) {
					const intersection = intersectLineSegmentPolygon(
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

		const current = editor.getSelectedShapeIds()
		const next = new Set<TLShapeId>(
			shiftKey ? [...newlySelectedShapeIds, ...initialSelectedShapeIds] : [...newlySelectedShapeIds]
		)
		if (current.length !== next.size || current.some((id) => !next.has(id))) {
			this.editor.setSelectedShapes(Array.from(next))
		}
	}

	private complete() {
		this.updateScribbleSelection(true)
		this.parent.transition('idle')
	}

	private cancel() {
		this.editor.setSelectedShapes([...this.initialSelectedShapeIds])
		this.parent.transition('idle')
	}
}
