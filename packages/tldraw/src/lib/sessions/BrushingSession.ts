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

	override onStart() {
		const { editor } = this
		const { altKey, currentPagePoint } = editor.inputs

		this.strategy = altKey ? 'scribble' : 'box'

		this.isWrapMode = editor.user.getIsWrapMode()

		editor
			.getCurrentPageShapes()
			.filter(
				(shape) =>
					editor.isShapeOfType<TLGroupShape>(shape, 'group') ||
					editor.isShapeOrAncestorLocked(shape)
			)
			.forEach((shape) => this.excludedShapeIds.add(shape.id))

		this.initialSelectedShapeIds = editor.getSelectedShapeIds().slice()

		this.initialStartShape = editor.getShapesAtPoint(currentPagePoint)[0]
	}

	override onUpdate() {
		const { editor } = this

		if (!editor.inputs.isPointing) {
			this.complete()
			return
		}

		moveCameraWhenCloseToEdge(editor)

		const strategy = editor.inputs.altKey ? 'scribble' : 'box'

		if (strategy !== this.strategy) {
			editor.setSelectedShapes([])
			this.clearStuff()
			this.strategy = strategy
		}

		switch (strategy) {
			case 'box': {
				this.updateBoxBrush()
				break
			}
			case 'scribble': {
				this.updateScribbleBrush()
				break
			}
		}
	}

	override onCancel() {
		const { editor } = this
		editor.setSelectedShapes(this.initialSelectedShapeIds, { squashing: true })
		return
	}

	override onInterrupt() {
		const { editor } = this
		editor.updateInstanceState({ brush: null })
	}

	private clearStuff() {
		const { editor } = this
		editor.updateInstanceState({ brush: null })
		this.scribbledShapeIds.clear()

		if (this.scribbleId) {
			editor.scribbles.stop(this.scribbleId)
		}

		this.scribbleId = null
	}

	private updateScribbleBrush() {
		const { editor } = this
		const zoomLevel = editor.getZoomLevel()
		const currentPageShapes = editor.getCurrentPageShapes()

		const {
			inputs: { originPagePoint, previousPagePoint, currentPagePoint, shiftKey },
		} = editor

		if (!this.scribbleId) {
			// start the scribble brushing
			const scribbleItem = editor.scribbles.addScribble({
				color: 'selection-stroke',
				opacity: 0.32,
				size: 12,
			})
			this.scribbleId = scribbleItem.id
		}

		const { scribbledShapeIds } = this

		const { x, y } = editor.inputs.currentPagePoint
		editor.scribbles.addPoint(this.scribbleId, x, y)

		const shapes = currentPageShapes
		let shape: TLShape, geometry: Geometry2d, A: Vec, B: Vec

		for (let i = 0, n = shapes.length; i < n; i++) {
			shape = shapes[i]
			geometry = editor.getShapeGeometry(shape)

			// If the shape is a group or is already selected or locked, don't select it
			if (
				editor.isShapeOfType<TLGroupShape>(shape, 'group') ||
				scribbledShapeIds.has(shape.id) ||
				editor.isShapeOrAncestorLocked(shape)
			) {
				continue
			}

			// If the scribble started inside of the frame, don't select it
			if (editor.isShapeOfType<TLFrameShape>(shape, 'frame')) {
				const point = editor.getPointInShapeSpace(shape, originPagePoint)
				if (geometry.bounds.containsPoint(point)) {
					continue
				}
			}

			A = editor.getPointInShapeSpace(shape, previousPagePoint)
			B = editor.getPointInShapeSpace(shape, currentPagePoint)
			if (geometry.hitTestLineSegment(A, B, HIT_TEST_MARGIN / zoomLevel)) {
				const outermostShape = editor.getOutermostSelectableShape(shape)

				const pageMask = editor.getShapeMask(outermostShape.id)

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

		editor.setSelectedShapes(
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

	private updateBoxBrush() {
		const { editor } = this
		const {
			inputs: { originPagePoint, currentPagePoint, shiftKey, ctrlKey },
		} = editor

		const zoomLevel = editor.getZoomLevel()
		const currentPageShapes = editor.getCurrentPageShapes()
		const currentPageId = editor.getCurrentPageId()

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

			pageBounds = editor.getShapePageBounds(shape)
			if (!pageBounds) continue testAllShapes

			// If the brush fully wraps a shape, it's almost certainly a hit
			if (this.brush.contains(pageBounds)) {
				this.handleBoxBrushHit(shape, currentPagePoint, currentPageId, results, corners)
				continue testAllShapes
			}

			// Should we even test for a single segment intersections? Only if
			// we're not holding the ctrl key for alternate selection mode
			// (only wraps count!), or if the shape is a frame.
			if (isWrapping || editor.isShapeOfType<TLFrameShape>(shape, 'frame')) {
				continue testAllShapes
			}

			// If the brush collides the page bounds, then do hit tests against
			// each of the brush's four sides.
			if (this.brush.collides(pageBounds)) {
				// Shapes expect to hit test line segments in their own coordinate system,
				// so we first need to get the brush corners in the shape's local space.
				const geometry = editor.getShapeGeometry(shape)

				pageTransform = editor.getShapePageTransform(shape)

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

		editor.updateInstanceState({ brush: { ...this.brush.toJson() } })
		editor.setSelectedShapes(Array.from(results), { squashing: true })
	}

	private handleBoxBrushHit(
		shape: TLShape,
		currentPagePoint: Vec,
		currentPageId: TLPageId,
		results: Set<TLShapeId>,
		corners: Vec[]
	) {
		const { editor } = this

		if (shape.parentId === currentPageId) {
			results.add(shape.id)
			return
		}

		// Find the outermost selectable shape, check to see if it has a
		// page mask; and if so, check to see if the brush intersects it
		const selectedShape = editor.getOutermostSelectableShape(shape)
		const pageMask = editor.getShapeMask(selectedShape.id)

		if (
			pageMask &&
			!polygonsIntersect(pageMask, corners) &&
			!pointInPolygon(currentPagePoint, pageMask)
		) {
			return
		}

		results.add(selectedShape.id)
	}

	override onEnd() {
		this.clearStuff()
		return
	}
}
