import {
	Box2d,
	HIT_TEST_MARGIN,
	Matrix2d,
	StateNode,
	TLCancelEvent,
	TLEventHandlers,
	TLFrameShape,
	TLGroupShape,
	TLInterruptEvent,
	TLKeyboardEvent,
	TLPageId,
	TLPointerEventInfo,
	TLShape,
	TLShapeId,
	Vec2d,
	pointInPolygon,
	polygonsIntersect,
} from '@tldraw/editor'

export class Brushing extends StateNode {
	static override id = 'brushing'

	info = {} as TLPointerEventInfo & { target: 'canvas' }

	brush = new Box2d()
	initialSelectedShapeIds: TLShapeId[] = []
	excludedShapeIds = new Set<TLShapeId>()

	// The shape that the brush started on
	initialStartShape: TLShape | null = null

	override onEnter = (info: TLPointerEventInfo & { target: 'canvas' }) => {
		const { altKey, currentPagePoint } = this.editor.inputs

		if (altKey) {
			this.parent.transition('scribble_brushing', info)
			return
		}

		this.excludedShapeIds = new Set(
			this.editor
				.getCurrentPageShapes()
				.filter(
					(shape) =>
						this.editor.isShapeOfType<TLGroupShape>(shape, 'group') ||
						this.editor.isShapeOrAncestorLocked(shape)
				)
				.map((shape) => shape.id)
		)

		this.info = info
		this.initialSelectedShapeIds = this.editor.getSelectedShapeIds().slice()
		this.initialStartShape = this.editor.getShapesAtPoint(currentPagePoint)[0]
		this.onPointerMove()
	}

	override onExit = () => {
		this.initialSelectedShapeIds = []
		this.editor.updateInstanceState({ brush: null })
	}

	override onPointerMove = () => {
		this.hitTestShapes()
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.complete()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.complete()
	}

	override onCancel?: TLCancelEvent | undefined = (info) => {
		this.editor.setSelectedShapes(this.initialSelectedShapeIds, { squashing: true })
		this.parent.transition('idle', info)
	}

	override onKeyDown: TLEventHandlers['onKeyDown'] = (info) => {
		if (this.editor.inputs.altKey) {
			this.parent.transition('scribble_brushing', info)
		} else {
			this.hitTestShapes()
		}
	}

	override onKeyUp?: TLKeyboardEvent | undefined = () => {
		this.hitTestShapes()
	}

	private complete() {
		this.parent.transition('idle')
	}

	private hitTestShapes() {
		const zoomLevel = this.editor.getZoomLevel()
		const currentPageShapes = this.editor.getCurrentPageShapes()
		const currentPageId = this.editor.getCurrentPageId()
		const {
			inputs: { originPagePoint, currentPagePoint, shiftKey, ctrlKey },
		} = this.editor

		// Set the brush to contain the current and origin points
		this.brush.setTo(Box2d.FromPoints([originPagePoint, currentPagePoint]))

		// We'll be collecting shape ids
		const results = new Set(shiftKey ? this.initialSelectedShapeIds : [])

		let A: Vec2d,
			B: Vec2d,
			shape: TLShape,
			pageBounds: Box2d | undefined,
			pageTransform: Matrix2d | undefined,
			localCorners: Vec2d[]

		// We'll be testing the corners of the brush against the shapes
		const { corners } = this.brush

		const { excludedShapeIds } = this

		testAllShapes: for (let i = 0, n = currentPageShapes.length; i < n; i++) {
			shape = currentPageShapes[i]
			if (excludedShapeIds.has(shape.id)) continue testAllShapes
			if (results.has(shape.id)) continue testAllShapes

			pageBounds = this.editor.getShapePageBounds(shape)
			if (!pageBounds) continue testAllShapes

			// If the brush fully wraps a shape, it's almost certainly a hit
			if (this.brush.contains(pageBounds)) {
				this.handleHit(shape, currentPagePoint, currentPageId, results, corners)
				continue testAllShapes
			}

			// Should we even test for a single segment intersections? Only if
			// we're not holding the ctrl key for alternate selection mode
			// (only wraps count!), or if the shape is a frame.
			if (ctrlKey || this.editor.isShapeOfType<TLFrameShape>(shape, 'frame')) {
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
						this.handleHit(shape, currentPagePoint, currentPageId, results, corners)
						break hitTestBrushEdges
					}
				}
			}
		}

		this.editor.updateInstanceState({ brush: { ...this.brush.toJson() } })
		this.editor.setSelectedShapes(Array.from(results), { squashing: true })
	}

	override onInterrupt: TLInterruptEvent = () => {
		this.editor.updateInstanceState({ brush: null })
	}

	private handleHit(
		shape: TLShape,
		currentPagePoint: Vec2d,
		currentPageId: TLPageId,
		results: Set<TLShapeId>,
		corners: Vec2d[]
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
