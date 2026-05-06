import { Box, StateNode, TLPointerEventInfo, TLShapeId, pointInPolygon } from '@tldraw/editor'

export class Erasing extends StateNode {
	static override id = 'erasing'
	static override trackPerformance = true

	private info = {} as TLPointerEventInfo
	private scribbleId = 'id'
	private markId = ''
	private excludedShapeIds = new Set<TLShapeId>()

	_erasingShapeIds: TLShapeId[] = []

	override onEnter(info: TLPointerEventInfo) {
		this.markId = this.editor.markHistoryStoppingPoint('erase scribble begin')
		this.info = info

		const originPagePoint = this.editor.inputs.getOriginPagePoint()
		this.excludedShapeIds = new Set(
			this.editor
				.getCurrentPageShapes()
				.filter((shape) => {
					//If the shape is locked, we shouldn't erase it
					if (this.editor.isShapeOrAncestorLocked(shape)) return true
					//If the shape is a group or frame-like, check we're inside it when we start erasing
					if (this.editor.isShapeOfType(shape, 'group') || this.editor.isShapeFrameLike(shape)) {
						const pointInShapeShape = this.editor.getPointInShapeSpace(shape, originPagePoint)
						const geometry = this.editor.getShapeGeometry(shape)
						return geometry.bounds.containsPoint(pointInShapeShape)
					}

					return false
				})
				.map((shape) => shape.id)
		)

		this._erasingShapeIds = this.editor
			.getShapesAtPoint(originPagePoint)
			.filter((s) => !this.excludedShapeIds.has(s.id))
			.map((s) => s.id)

		this.editor.setErasingShapes([
			...new Set([...this.editor.getErasingShapeIds(), ...this._erasingShapeIds]),
		])

		const scribble = this.editor.scribbles.addScribble({
			color: 'muted-1',
			size: 12,
		})
		this.scribbleId = scribble.id

		this.update()
	}

	private pushPointToScribble() {
		const { x, y } = this.editor.inputs.getCurrentPagePoint()
		this.editor.scribbles.addPoint(this.scribbleId, x, y)
	}

	override onExit() {
		this.editor.setErasingShapes([])
		this.editor.scribbles.stop(this.scribbleId)
	}

	override onPointerMove() {
		this.update()
	}

	override onPointerUp(info: TLPointerEventInfo) {
		this.complete(info)
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
		const currentPagePoint = editor.inputs.getCurrentPagePoint()
		const previousPagePoint = editor.inputs.getPreviousPagePoint()

		this.pushPointToScribble()

		// Otherwise, erasing shapes are all the shapes that were hit before plus any new shapes that are hit
		const erasing = new Set<TLShapeId>(erasingShapeIds)
		const minDist = this.editor.options.hitTestMargin / zoomLevel

		// Create bounds around line segment with margin
		const lineBounds = Box.FromPoints([previousPagePoint, currentPagePoint]).expandBy(minDist)
		const candidateIds = editor.getShapeIdsInsideBounds(lineBounds)

		// Early return if no candidates - avoid expensive getCurrentPageRenderingShapesSorted()
		if (candidateIds.size === 0) {
			editor.setErasingShapes(Array.from(erasing))
			return
		}

		const allShapes = editor.getCurrentPageRenderingShapesSorted()
		const currentPageShapes = allShapes.filter((shape) => candidateIds.has(shape.id))

		for (const shape of currentPageShapes) {
			if (editor.isShapeOfType(shape, 'group')) continue

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

			// If a shape is hit and is part of a group, erase the group
			// If we started erasing inside a group's bounds, erase child shapes (or nested groups) inside it
			if (geometry.hitTestLineSegment(A, B, minDist)) {
				const outermost = editor.getOutermostSelectableShape(shape)
				if (excludedShapeIds.has(outermost.id)) {
					erasing.add(
						editor.getOutermostSelectableShape(shape, (s) => !excludedShapeIds.has(s.id)).id
					)
				} else {
					erasing.add(outermost.id)
				}
			}

			this._erasingShapeIds = [...erasing]
		}

		// Remove the hit shapes, except if they're in the list of excluded shapes
		// (these excluded shapes will be any frames or groups the pointer was inside of
		// when the user started erasing)
		this.editor.setErasingShapes(this._erasingShapeIds.filter((id) => !excludedShapeIds.has(id)))
	}

	complete(info?: TLPointerEventInfo) {
		const { editor } = this
		editor.deleteShapes(editor.getCurrentPageState().erasingShapeIds)
		this.parent.transition('idle', info)
		this._erasingShapeIds = []
	}

	cancel() {
		const { editor } = this
		editor.bailToMark(this.markId)
		this.parent.transition('idle', this.info)
	}
}
