import {
	StateNode,
	TLFrameShape,
	TLGroupShape,
	TLPointerEventInfo,
	TLShapeId,
	pointInPolygon,
} from '@tldraw/editor'

export class Erasing extends StateNode {
	static override id = 'erasing'

	private info = {} as TLPointerEventInfo
	private scribbleId = 'id'
	private markId = ''
	private excludedShapeIds = new Set<TLShapeId>()

	override onEnter(info: TLPointerEventInfo) {
		this.markId = this.editor.markHistoryStoppingPoint('erase scribble begin')
		this.info = info

		const { originPagePoint } = this.editor.inputs
		this.excludedShapeIds = new Set(
			this.editor
				.getCurrentPageShapes()
				.filter((shape) => {
					//If the shape is locked, we shouldn't erase it
					if (this.editor.isShapeOrAncestorLocked(shape)) return true
					//If the shape is a group or frame, check we're inside it when we start erasing
					if (
						this.editor.isShapeOfType<TLGroupShape>(shape, 'group') ||
						this.editor.isShapeOfType<TLFrameShape>(shape, 'frame')
					) {
						const pointInShapeShape = this.editor.getPointInShapeSpace(shape, originPagePoint)
						const geometry = this.editor.getShapeGeometry(shape)
						return geometry.bounds.containsPoint(pointInShapeShape)
					}

					return false
				})
				.map((shape) => shape.id)
		)

		const scribble = this.editor.scribbles.addScribble({
			color: 'muted-1',
			size: 12,
		})
		this.scribbleId = scribble.id

		this.update()
	}

	private pushPointToScribble() {
		const { x, y } = this.editor.inputs.currentPagePoint
		this.editor.scribbles.addPoint(this.scribbleId, x, y)
	}

	override onExit() {
		this.editor.setErasingShapes([])
		this.editor.scribbles.stop(this.scribbleId)
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

	override onComplete() {
		this.complete()
	}

	update() {
		const { editor, excludedShapeIds } = this
		const erasingShapeIds = editor.getErasingShapeIds()
		const zoomLevel = editor.getZoomLevel()
		const currentPageShapes = editor.getCurrentPageRenderingShapesSorted()
		const {
			inputs: { currentPagePoint, previousPagePoint },
		} = editor

		this.pushPointToScribble()

		const erasing = new Set<TLShapeId>(erasingShapeIds)
		const minDist = this.editor.options.hitTestMargin / zoomLevel

		for (const shape of currentPageShapes) {
			if (editor.isShapeOfType<TLGroupShape>(shape, 'group')) continue

			// Avoid testing masked shapes, unless the pointer is inside the mask
			const pageMask = editor.getShapeMask(shape.id)
			if (pageMask && !pointInPolygon(currentPagePoint, pageMask)) {
				continue
			}

			// Hit test the shape using a line segment
			const geometry = editor.getShapeGeometry(shape)
			const pageTransform = editor.getShapePageTransform(shape)
			if (!geometry || !pageTransform) continue
			const pt = pageTransform.clone().invert()
			const A = pt.applyToPoint(previousPagePoint)
			const B = pt.applyToPoint(currentPagePoint)

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
				erasing.add(editor.getOutermostSelectableShape(shape).id)
			}
		}

		// Remove the hit shapes, except if they're in the list of excluded shapes
		// (these excluded shapes will be any frames or groups the pointer was inside of
		// when the user started erasing)
		this.editor.setErasingShapes([...erasing].filter((id) => !excludedShapeIds.has(id)))
	}

	complete() {
		const { editor } = this
		editor.deleteShapes(editor.getCurrentPageState().erasingShapeIds)
		this.parent.transition('idle')
	}

	cancel() {
		const { editor } = this
		editor.bailToMark(this.markId)
		this.parent.transition('idle', this.info)
	}
}
