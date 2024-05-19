import {
	Box,
	Mat,
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
	Vec,
	moveCameraWhenCloseToEdge,
	pointInPolygon,
	polygonsIntersect,
} from '@tldraw/editor'

export class Brushing extends StateNode {
	static override id = 'brushing'

	info = {} as TLPointerEventInfo & { target: 'canvas' }

	initialSelectedShapeIds: TLShapeId[] = []
	excludedShapeIds = new Set<TLShapeId>()
	isWrapMode = false

	// The shape that the brush started on
	initialStartShape: TLShape | null = null

	override onEnter = (info: TLPointerEventInfo & { target: 'canvas' }) => {
		const { altKey, currentPagePoint } = this.editor.inputs

		this.isWrapMode = this.editor.user.getIsWrapMode()

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
		this.hitTestShapes()
	}

	override onExit = () => {
		this.initialSelectedShapeIds = []
		this.editor.updateInstanceState({ brush: null })
	}

	override onTick = () => {
		moveCameraWhenCloseToEdge(this.editor)
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
		this.editor.setSelectedShapes(this.initialSelectedShapeIds)
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
		this.hitTestShapes()
		this.parent.transition('idle')
	}

	private hitTestShapes() {
		const { editor, excludedShapeIds, isWrapMode } = this
		const {
			inputs: { originPagePoint, currentPagePoint, shiftKey, ctrlKey },
		} = editor

		// We'll be collecting shape ids of selected shapes; if we're holding shift key, we start from our initial shapes
		const results = new Set(shiftKey ? this.initialSelectedShapeIds : [])

		// In wrap mode, we need to completely enclose a shape to select it
		const isWrapping = isWrapMode ? !ctrlKey : ctrlKey

		// Set the brush to contain the current and origin points
		const brush = Box.FromPoints([originPagePoint, currentPagePoint])

		// We'll be testing the corners of the brush against the shapes
		const { corners } = brush

		let A: Vec,
			B: Vec,
			shape: TLShape,
			pageBounds: Box | undefined,
			pageTransform: Mat | undefined,
			localCorners: Vec[]

		const currentPageShapes = editor.getCurrentPageShapes()
		const currentPageId = editor.getCurrentPageId()

		testAllShapes: for (let i = 0, n = currentPageShapes.length; i < n; i++) {
			shape = currentPageShapes[i]
			if (excludedShapeIds.has(shape.id) || results.has(shape.id)) continue testAllShapes

			pageBounds = editor.getShapePageBounds(shape)
			if (!pageBounds) continue testAllShapes

			// If the brush fully wraps a shape, it's almost certainly a hit
			if (brush.contains(pageBounds)) {
				this.handleHit(shape, currentPagePoint, currentPageId, results, corners)
				continue testAllShapes
			}

			// If we're in wrap mode and the brush did not fully encloses the shape, it's a miss
			// We also skip frames unless we've completely selected the frame.
			if (isWrapping || editor.isShapeOfType<TLFrameShape>(shape, 'frame')) {
				continue testAllShapes
			}

			// If the brush collides the page bounds, then do hit tests against
			// each of the brush's four sides.
			if (brush.collides(pageBounds)) {
				// Shapes expect to hit test line segments in their own coordinate system,
				// so we first need to get the brush corners in the shape's local space.
				pageTransform = editor.getShapePageTransform(shape)
				if (!pageTransform) continue testAllShapes
				localCorners = pageTransform.clone().invert().applyToPoints(corners)
				// See if any of the edges intersect the shape's geometry
				const geometry = editor.getShapeGeometry(shape)
				hitTestBrushEdges: for (let i = 0; i < 4; i++) {
					A = localCorners[i]
					B = localCorners[(i + 1) % 4]
					if (geometry.hitTestLineSegment(A, B, 0)) {
						this.handleHit(shape, currentPagePoint, currentPageId, results, corners)
						break hitTestBrushEdges
					}
				}
			}
		}
		editor.getInstanceState().isCoarsePointer

		const currentBrush = editor.getInstanceState().brush
		if (!currentBrush || !brush.equals(currentBrush)) {
			editor.updateInstanceState({ brush: { ...brush.toJson() } })
		}

		const current = editor.getSelectedShapeIds()
		if (current.length !== results.size || current.some((id) => !results.has(id))) {
			editor.setSelectedShapes(Array.from(results))
		}
	}

	override onInterrupt: TLInterruptEvent = () => {
		this.editor.updateInstanceState({ brush: null })
	}

	private handleHit(
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
