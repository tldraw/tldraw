import {
	Box,
	Geometry2d,
	HIT_TEST_MARGIN,
	Mat,
	Session,
	TLFrameShape,
	TLGroupShape,
	TLPageId,
	TLShape,
	TLShapeId,
	Vec,
	intersectLineSegmentPolyline,
	moveCameraWhenCloseToEdge,
	pointInPolygon,
	polygonsIntersect,
} from '@tldraw/editor'

export class BrushingSession extends Session {
	readonly id = 'brushing'

	strategy: 'box' | 'scribble' = 'box'

	isWrapMode = false

	brush = new Box()

	scribbleId: string | null = null

	excludedShapeIds = new Set<TLShapeId>()
	initialSelectedShapeIds: TLShapeId[] = []
	initialStartShape?: TLShape

	scribbledShapeIds = new Set<TLShapeId>()

	onStart() {
		const { altKey, currentPagePoint } = this.editor.inputs

		this.strategy = altKey ? 'scribble' : 'box'

		this.isWrapMode = this.editor.user.getIsWrapMode()

		this.editor
			.getCurrentPageShapes()
			.filter(
				(shape) =>
					this.editor.isShapeOfType<TLGroupShape>(shape, 'group') ||
					this.editor.isShapeOrAncestorLocked(shape)
			)
			.forEach((shape) => this.excludedShapeIds.add(shape.id))

		this.initialSelectedShapeIds = this.editor.getSelectedShapeIds().slice()

		this.initialStartShape = this.editor.getShapesAtPoint(currentPagePoint)[0]
	}

	onUpdate() {
		moveCameraWhenCloseToEdge(this.editor)

		const strategy = this.editor.inputs.altKey ? 'scribble' : 'box'

		if (strategy !== this.strategy) {
			this.editor.setSelectedShapes([])
			this.clearStuff()
			this.strategy = strategy
		}

		switch (strategy) {
			case 'box': {
				this.boxBrush()
				break
			}
			case 'scribble': {
				this.scribbleBrush()
				break
			}
		}
	}

	onComplete() {
		this.clearStuff()
		this.editor.setCurrentTool('select.idle')
	}

	onCancel() {
		this.clearStuff()
		this.editor.setSelectedShapes(this.initialSelectedShapeIds, { squashing: true })
		this.editor.setCurrentTool('select.idle')
	}

	onInterrupt() {
		this.editor.updateInstanceState({ brush: null })
	}

	private clearStuff() {
		this.editor.updateInstanceState({ brush: null })
		this.scribbledShapeIds.clear()

		if (this.scribbleId) {
			this.editor.scribbles.stop(this.scribbleId)
		}

		this.scribbleId = null
	}

	private scribbleBrush() {
		const zoomLevel = this.editor.getZoomLevel()
		const currentPageShapes = this.editor.getCurrentPageShapes()

		const {
			inputs: { originPagePoint, previousPagePoint, currentPagePoint, shiftKey },
		} = this.editor

		if (!this.scribbleId) {
			// start the scribble brushing
			const scribbleItem = this.editor.scribbles.addScribble({
				color: 'selection-stroke',
				opacity: 0.32,
				size: 12,
			})
			this.scribbleId = scribbleItem.id
		}

		const { scribbledShapeIds } = this

		const { x, y } = this.editor.inputs.currentPagePoint
		this.editor.scribbles.addPoint(this.scribbleId, x, y)

		const shapes = currentPageShapes
		let shape: TLShape, geometry: Geometry2d, A: Vec, B: Vec

		for (let i = 0, n = shapes.length; i < n; i++) {
			shape = shapes[i]
			geometry = this.editor.getShapeGeometry(shape)

			// If the shape is a group or is already selected or locked, don't select it
			if (
				this.editor.isShapeOfType<TLGroupShape>(shape, 'group') ||
				scribbledShapeIds.has(shape.id) ||
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

				scribbledShapeIds.add(outermostShape.id)
			}
		}

		this.editor.setSelectedShapes(
			[
				...new Set<TLShapeId>(
					shiftKey
						? [...scribbledShapeIds, ...this.initialSelectedShapeIds]
						: [...scribbledShapeIds]
				),
			],
			{ squashing: true }
		)
	}

	private boxBrush() {
		const {
			inputs: { originPagePoint, currentPagePoint, shiftKey, ctrlKey },
		} = this.editor

		const zoomLevel = this.editor.getZoomLevel()
		const currentPageShapes = this.editor.getCurrentPageShapes()
		const currentPageId = this.editor.getCurrentPageId()

		// Set the brush to contain the current and origin points
		this.brush.setTo(Box.FromPoints([originPagePoint, currentPagePoint]))

		// We'll be collecting shape ids
		const results = new Set(shiftKey ? this.initialSelectedShapeIds : [])

		let A: Vec,
			B: Vec,
			shape: TLShape,
			pageBounds: Box | undefined,
			pageTransform: Mat | undefined,
			localCorners: Vec[]

		// We'll be testing the corners of the brush against the shapes
		const { corners } = this.brush

		const { excludedShapeIds, isWrapMode } = this

		const isWrapping = isWrapMode ? !ctrlKey : ctrlKey

		testAllShapes: for (let i = 0, n = currentPageShapes.length; i < n; i++) {
			shape = currentPageShapes[i]
			if (excludedShapeIds.has(shape.id)) continue testAllShapes
			if (results.has(shape.id)) continue testAllShapes

			pageBounds = this.editor.getShapePageBounds(shape)
			if (!pageBounds) continue testAllShapes

			// If the brush fully wraps a shape, it's almost certainly a hit
			if (this.brush.contains(pageBounds)) {
				this.handleBoxBrushHit(shape, currentPagePoint, currentPageId, results, corners)
				continue testAllShapes
			}

			// Should we even test for a single segment intersections? Only if
			// we're not holding the ctrl key for alternate selection mode
			// (only wraps count!), or if the shape is a frame.
			if (isWrapping || this.editor.isShapeOfType<TLFrameShape>(shape, 'frame')) {
				continue testAllShapes
			}

			// If the brush collides the page bounds, then do hit tests against
			// each of the brush's four sides.
			if (this.brush.collides(pageBounds)) {
				// Shapes expect to hit test line segments in their own coordinate system,
				// so we first need to get the brush corners in the shape's local space.
				const geometry = this.editor.getShapeGeometry(shape)

				pageTransform = this.editor.getShapePageTransform(shape)

				if (!pageTransform) {
					continue testAllShapes
				}

				// Check whether any of the the brush edges intersect the shape
				localCorners = pageTransform.clone().invert().applyToPoints(corners)

				hitTestBrushEdges: for (let i = 0; i < localCorners.length; i++) {
					A = localCorners[i]
					B = localCorners[(i + 1) % localCorners.length]

					if (geometry.hitTestLineSegment(A, B, HIT_TEST_MARGIN / zoomLevel)) {
						this.handleBoxBrushHit(shape, currentPagePoint, currentPageId, results, corners)
						break hitTestBrushEdges
					}
				}
			}
		}

		this.editor.updateInstanceState({ brush: { ...this.brush.toJson() } })
		this.editor.setSelectedShapes(Array.from(results), { squashing: true })
	}

	private handleBoxBrushHit(
		shape: TLShape,
		currentPagePoint: Vec,
		currentPageId: TLPageId,
		results: Set<TLShapeId>,
		corners: Vec[]
	) {
		if (shape.parentId === currentPageId) {
			results.add(shape.id)
			return
		}

		// Find the outermost selectable shape, check to see if it has a
		// page mask; and if so, check to see if the brush intersects it
		const selectedShape = this.editor.getOutermostSelectableShape(shape)
		const pageMask = this.editor.getShapeMask(selectedShape.id)

		if (
			pageMask &&
			!polygonsIntersect(pageMask, corners) &&
			!pointInPolygon(currentPagePoint, pageMask)
		) {
			return
		}

		results.add(selectedShape.id)
	}
}
