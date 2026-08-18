import {
	Box,
	StateNode,
	TLCancelEventInfo,
	TLKeyboardEventInfo,
	TLPageId,
	TLPointerEventInfo,
	TLShape,
	TLShapeId,
	TLTickEventInfo,
	Vec,
	pointInPolygon,
	polygonsIntersect,
	react,
} from '@tldraw/editor'

export class Brushing extends StateNode {
	static override id = 'brushing'
	static override trackPerformance = true

	info = {} as TLPointerEventInfo & { target: 'canvas' }

	initialSelectedShapeIds: TLShapeId[] = []
	excludedShapeIds = new Set<TLShapeId>()
	isWrapMode = false

	viewportDidChange = false
	cleanupViewportChangeReactor?: () => void

	override onEnter(info: TLPointerEventInfo & { target: 'canvas' }) {
		const { editor } = this
		const altKey = editor.inputs.getAltKey()

		this.isWrapMode = editor.user.getIsWrapMode()

		this.viewportDidChange = false

		let isInitialCheck = true

		this.cleanupViewportChangeReactor = react('viewport change while brushing', () => {
			editor.getViewportPageBounds() // capture the viewport change
			if (!isInitialCheck && !this.viewportDidChange) {
				this.viewportDidChange = true
			}
		})

		if (altKey) {
			this.parent.transition('scribble_brushing', info)
			return
		}

		const selectLockedShapes = editor.options.selectLockedShapes
		this.excludedShapeIds = new Set(
			editor
				.getCurrentPageShapes()
				.filter(
					(shape) =>
						editor.isShapeOfType(shape, 'group') ||
						(!selectLockedShapes && editor.isShapeOrAncestorLocked(shape))
				)
				.map((shape) => shape.id)
		)

		this.info = info
		this.initialSelectedShapeIds = editor.getSelectedShapeIds().slice()
		this.hitTestShapes()
		isInitialCheck = false
	}

	override onExit() {
		this.initialSelectedShapeIds = []
		this.editor.updateInstanceState({ brush: null })

		this.cleanupViewportChangeReactor?.()
	}

	override onTick({ elapsed }: TLTickEventInfo) {
		const { editor } = this
		if (!editor.inputs.getIsDragging() || editor.inputs.getIsPanning()) return
		editor.edgeScrollManager.updateEdgeScrolling(elapsed)
	}

	override onPointerMove() {
		this.hitTestShapes()
	}

	override onPointerUp() {
		this.complete()
	}

	override onComplete() {
		this.complete()
	}

	override onCancel(info: TLCancelEventInfo) {
		this.editor.setSelectedShapes(this.initialSelectedShapeIds)
		this.parent.transition('idle', info)
	}

	override onKeyDown(info: TLKeyboardEventInfo) {
		if (this.editor.inputs.getAltKey()) {
			this.parent.transition('scribble_brushing', info)
		} else {
			this.hitTestShapes()
		}
	}

	override onKeyUp() {
		this.hitTestShapes()
	}

	private complete() {
		this.hitTestShapes()
		this.parent.transition('idle')
	}

	private hitTestShapes() {
		const { editor, excludedShapeIds, isWrapMode } = this
		const originPagePoint = editor.inputs.getOriginPagePoint()
		const currentPagePoint = editor.inputs.getCurrentPagePoint()
		const shiftKey = editor.inputs.getShiftKey()
		const ctrlKey = editor.inputs.getCtrlKey()

		const results = new Set(shiftKey ? this.initialSelectedShapeIds : [])

		// In wrap mode, we need to completely enclose a shape to select it
		const isWrapping = isWrapMode ? !ctrlKey : ctrlKey

		const brush = Box.FromPoints([originPagePoint, currentPagePoint])
		const { corners } = brush

		// We could cache all of the shape positions at the start of the interaction and do very
		// fast checks against them, but then changes introduced by other collaborators wouldn't
		// be reflected: a user could select a shape by selecting where it _used_ to be.
		//
		// We still avoid hit tests as much as possible by testing only on-screen shapes UNLESS
		// the user has scrolled their viewport or is dragging outside of the screen (e.g. in a
		// window). On a page with ~5000 shapes, on-screen hit tests are about 2x faster.
		const candidateIds = editor.getShapeIdsInsideBounds(brush)

		if (candidateIds.size > 0) {
			const brushBoxIsInsideViewport = editor.getViewportPageBounds().contains(brush)
			const currentPageId = editor.getCurrentPageId()

			const allShapes =
				brushBoxIsInsideViewport && !this.viewportDidChange
					? editor.getCurrentPageRenderingShapesSorted()
					: editor.getCurrentPageShapesSorted()

			for (const shape of allShapes) {
				if (!candidateIds.has(shape.id)) continue
				if (excludedShapeIds.has(shape.id) || results.has(shape.id)) continue

				const pageBounds = editor.getShapePageBounds(shape)
				if (!pageBounds) continue

				// If the brush fully wraps a shape, it's almost certainly a hit
				if (brush.contains(pageBounds)) {
					this.handleHit(shape, currentPagePoint, currentPageId, results, corners)
					continue
				}

				// In wrap mode a partial overlap is a miss. Frame-like shapes are only selected
				// when fully enclosed.
				if (isWrapping || editor.isShapeFrameLike(shape)) continue

				if (brush.collides(pageBounds)) {
					// Shapes expect to hit test line segments in their own coordinate system,
					// so we first need to get the brush corners in the shape's local space.
					const pageTransform = editor.getShapePageTransform(shape)
					if (!pageTransform) continue
					const localCorners = pageTransform.clone().invert().applyToPoints(corners)
					const geometry = editor.getShapeGeometry(shape)
					for (let i = 0; i < 4; i++) {
						if (geometry.hitTestLineSegment(localCorners[i], localCorners[(i + 1) % 4], 0)) {
							this.handleHit(shape, currentPagePoint, currentPageId, results, corners)
							break
						}
					}
				}
			}
		}

		const currentBrush = editor.getInstanceState().brush
		if (!currentBrush || !brush.equals(currentBrush)) {
			editor.updateInstanceState({ brush: { ...brush.toJson() } })
		}

		const current = editor.getSelectedShapeIds()
		if (current.length !== results.size || current.some((id) => !results.has(id))) {
			editor.setSelectedShapes(Array.from(results))
		}
	}

	override onInterrupt() {
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
