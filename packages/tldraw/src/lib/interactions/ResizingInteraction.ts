import {
	Editor,
	HALF_PI,
	Interaction,
	Mat,
	SelectionCorner,
	SelectionEdge,
	SelectionHandle,
	TLFrameShape,
	TLShape,
	TLShapeId,
	TLShapePartial,
	Vec,
	VecLike,
	areAnglesCompatible,
	compact,
	moveCameraWhenCloseToEdge,
	rotateSelectionHandle,
} from '@tldraw/editor'

export class ResizingInteraction extends Interaction<{
	isCreating?: boolean
	handle: SelectionHandle
}> {
	readonly id = 'resizing'

	private markId = ''

	// A switch to detect when the user is holding ctrl
	private didHoldCommand = false

	// Whether we're resizing by an edge (rather than a corner)
	private isEdge = false

	// we transition into the resizing state from the geo pointing state, which starts with a shape of size w: 1, h: 1,
	// so if the user drags x: +50, y: +50 after mouseDown, the shape will be w: 51, h: 51, which is too many pixels, alas
	// so we allow passing a further offset into this state to negate such issues
	private creationCursorOffset: VecLike = new Vec()

	private snapshot = {} as Snapshot

	private didResize = false

	override onStart() {
		const { editor } = this
		const { isCreating, handle } = this.info

		if (isCreating) {
			this.creationCursorOffset = new Vec(1, 1)
		}

		this.snapshot = createSnapshot(editor, handle)

		this.isEdge = handle === 'top' || handle === 'bottom' || handle === 'left' || handle === 'right'

		if (isCreating) {
			this.markId = `creating:${editor.getOnlySelectedShape()!.id}`
			// todo: move to tool that creates
			editor.setCursor({ type: 'cross', rotation: 0 })
		} else {
			this.markId = 'starting resizing'
			editor.mark(this.markId)
		}

		const { shapeSnapshots } = this.snapshot

		const changes: TLShapePartial[] = []

		shapeSnapshots.forEach(({ shape }) => {
			const util = editor.getShapeUtil(shape)
			const change = util.onResizeStart?.(shape)
			if (change) {
				changes.push(change)
			}
		})

		if (changes.length > 0) {
			editor.updateShapes(changes)
		}
	}

	override onUpdate() {
		const { editor } = this

		if (!editor.inputs.isPointing) {
			this.complete()
			return
		}

		if (!editor.inputs.isDragging) {
			if (this.didResize) {
				this.complete()
			} else {
				return
			}
		}

		if (!this.didResize) {
			this.didResize = true
		}

		moveCameraWhenCloseToEdge(editor)

		const { altKey, shiftKey, ctrlKey } = editor.inputs
		const {
			frames,
			shapeSnapshots,
			selectionBounds,
			cursorHandleOffset,
			selectedShapeIds,
			selectionRotation,
			canShapesDeform,
			initialSelectionPageBounds,
		} = this.snapshot

		const isAspectRatioLocked = shiftKey || !canShapesDeform

		// first negate the 'cursor handle offset'
		// we need to do this because we do grid snapping based on the page point of the handle
		// rather than the page point of the cursor, so it's easier to pretend that the cursor
		// is really where the handle actually is
		//
		// *** Massively zoomed-in diagram of the initial mouseDown ***
		//
		//
		//                         │
		//                         │
		//                         │
		//                         │
		//                         │
		//                         │
		//                         │
		//                         │corner handle
		//                     ┌───┴───┐
		//   selection         │       │
		//  ───────────────────┤   x◄──┼──── drag handle point   ▲
		//                     │       │                         │
		//                     └───────┘                         ├─ cursorHandleOffset.y
		//                                                       │
		//        originPagePoint───────►x─┐                     ▼
		//                               │ └─┐
		//                               │   └─┐
		//                               │     │ mouse (sorry)
		//                               └──┐ ┌┘
		//                                  │ │
		//                                  └─┘
		//                         ◄──┬──►
		//                            │
		//                   cursorHandleOffset.x

		const currentPagePoint = editor.inputs.currentPagePoint
			.clone()
			.sub(cursorHandleOffset)
			.sub(this.creationCursorOffset)
		const originPagePoint = editor.inputs.originPagePoint.clone().sub(cursorHandleOffset)

		if (editor.getInstanceState().isGridMode && !ctrlKey) {
			const { gridSize } = editor.getDocumentSettings()
			currentPagePoint.snapToGrid(gridSize)
		}

		const dragHandle = this.info.handle as SelectionCorner | SelectionEdge
		const scaleOriginHandle = rotateSelectionHandle(dragHandle, Math.PI)

		editor.snaps.clearIndicators()

		const shouldSnap = editor.user.getIsSnapMode() ? !ctrlKey : ctrlKey

		if (shouldSnap && selectionRotation % HALF_PI === 0) {
			const { nudge } = editor.snaps.shapeBounds.snapResizeShapes({
				dragDelta: Vec.Sub(currentPagePoint, originPagePoint),
				initialSelectionPageBounds: initialSelectionPageBounds,
				handle: rotateSelectionHandle(dragHandle, selectionRotation),
				isAspectRatioLocked,
				isResizingFromCenter: altKey,
			})

			currentPagePoint.add(nudge)
		}

		// get the page point of the selection handle opposite to the drag handle
		// or the center of the selection box if altKey is pressed
		const scaleOriginPage = Vec.RotWith(
			altKey ? selectionBounds.center : selectionBounds.getHandlePoint(scaleOriginHandle),
			selectionBounds.point,
			selectionRotation
		)

		// calculate the scale by measuring the current distance between the drag handle and the scale origin
		// and dividing by the original distance between the drag handle and the scale origin

		const distanceFromScaleOriginNow = Vec.Sub(currentPagePoint, scaleOriginPage).rot(
			-selectionRotation
		)

		const distanceFromScaleOriginAtStart = Vec.Sub(originPagePoint, scaleOriginPage).rot(
			-selectionRotation
		)

		const scale = Vec.DivV(distanceFromScaleOriginNow, distanceFromScaleOriginAtStart)

		if (!Number.isFinite(scale.x)) scale.x = 1
		if (!Number.isFinite(scale.y)) scale.y = 1

		const isXLocked = dragHandle === 'top' || dragHandle === 'bottom'
		const isYLocked = dragHandle === 'left' || dragHandle === 'right'

		// lock an axis if required
		if (isAspectRatioLocked) {
			if (isYLocked) {
				// holding shift and dragging either the left or the right edge
				scale.y = Math.abs(scale.x)
			} else if (isXLocked) {
				// holding shift and dragging either the top or the bottom edge
				scale.x = Math.abs(scale.y)
			} else if (Math.abs(scale.x) > Math.abs(scale.y)) {
				// holding shift and the drag has moved further in the x dimension
				scale.y = Math.abs(scale.x) * (scale.y < 0 ? -1 : 1)
			} else {
				// holding shift and the drag has moved further in the y dimension
				scale.x = Math.abs(scale.y) * (scale.x < 0 ? -1 : 1)
			}
		} else {
			// not holding shift, but still need to lock axes if dragging an edge
			if (isXLocked) {
				scale.x = 1
			}
			if (isYLocked) {
				scale.y = 1
			}
		}

		// Creating shapes stay with cross and edges stay the same
		// but corners may flip their cursor
		if (!this.info.isCreating && !this.isEdge) {
			const cursor = getResizingCursor({
				dragHandle,
				isFlippedX: scale.x < 0,
				isFlippedY: scale.y < 0,
				rotation: selectionRotation,
			})
			editor.setCursor(cursor)
		}

		for (const id of shapeSnapshots.keys()) {
			const snapshot = shapeSnapshots.get(id)!

			editor.resizeShape(id, scale, {
				initialShape: snapshot.shape,
				initialBounds: snapshot.bounds,
				initialPageTransform: snapshot.pageTransform,
				dragHandle,
				mode:
					selectedShapeIds.length === 1 && id === selectedShapeIds[0]
						? 'resize_bounds'
						: 'scale_shape',
				scaleOrigin: scaleOriginPage,
				scaleAxisRotation: selectionRotation,
			})
		}

		if (editor.inputs.ctrlKey) {
			this.didHoldCommand = true

			for (const { id, children } of frames) {
				if (!children.length) continue
				const initial = shapeSnapshots.get(id)!.shape
				const current = editor.getShape(id)!
				if (!(initial && current)) continue

				// If the user is holding ctrl, then preseve the position of the frame's children
				const dx = current.x - initial.x
				const dy = current.y - initial.y

				const delta = new Vec(dx, dy).rot(-initial.rotation)

				if (delta.x !== 0 || delta.y !== 0) {
					for (const child of children) {
						editor.updateShape({
							id: child.id,
							type: child.type,
							x: child.x - delta.x,
							y: child.y - delta.y,
						})
					}
				}
			}
		} else if (this.didHoldCommand) {
			this.didHoldCommand = false

			for (const { children } of frames) {
				if (!children.length) continue
				for (const child of children) {
					editor.updateShape({
						id: child.id,
						type: child.type,
						x: child.x,
						y: child.y,
					})
				}
			}
		}
	}

	override onComplete() {
		const { editor } = this
		const { shapeSnapshots } = this.snapshot

		const changes: TLShapePartial[] = []

		shapeSnapshots.forEach(({ shape }) => {
			const current = editor.getShape(shape.id)!
			const util = editor.getShapeUtil(shape)
			const change = util.onResizeEnd?.(shape, current)
			if (change) {
				changes.push(change)
			}
		})

		if (changes.length > 0) {
			editor.updateShapes(changes)
		}

		return
	}

	override onCancel() {
		this.editor.bailToMark(this.markId)
		return
	}
}

/* --------------------- Helpers -------------------- */

function createSnapshot(editor: Editor, handle: SelectionHandle) {
	const selectedShapeIds = editor.getSelectedShapeIds()
	const selectionRotation = editor.getSelectionRotation()
	const {
		inputs: { originPagePoint },
	} = editor

	const selectionBounds = editor.getSelectionRotatedPageBounds()!

	const dragHandlePoint = Vec.RotWith(
		selectionBounds.getHandlePoint(handle),
		selectionBounds.point,
		selectionRotation
	)

	const cursorHandleOffset = Vec.Sub(originPagePoint, dragHandlePoint)

	const shapeSnapshots = new Map<TLShapeId, ShapeSnapshot>()

	const frames: { id: TLShapeId; children: TLShape[] }[] = []

	selectedShapeIds.forEach((id) => {
		const shape = editor.getShape(id)
		if (shape) {
			if (shape.type === 'frame') {
				frames.push({
					id,
					children: compact(
						editor.getSortedChildIdsForParent(shape).map((id) => editor.getShape(id))
					),
				})
			}
			shapeSnapshots.set(shape.id, createShapeSnapshot(editor, shape))
			if (editor.isShapeOfType<TLFrameShape>(shape, 'frame') && selectedShapeIds.length === 1)
				return
			editor.visitDescendants(shape.id, (descendantId) => {
				const descendent = editor.getShape(descendantId)
				if (descendent) {
					shapeSnapshots.set(descendent.id, createShapeSnapshot(editor, descendent))
					if (editor.isShapeOfType<TLFrameShape>(descendent, 'frame')) {
						return false
					}
				}
			})
		}
	})

	const canShapesDeform = ![...shapeSnapshots.values()].some(
		(shape) =>
			!areAnglesCompatible(shape.pageRotation, selectionRotation) || shape.isAspectRatioLocked
	)

	return {
		shapeSnapshots,
		selectionBounds,
		cursorHandleOffset,
		selectionRotation,
		selectedShapeIds,
		canShapesDeform,
		initialSelectionPageBounds: editor.getSelectionPageBounds()!,
		frames,
	}
}

type Snapshot = ReturnType<typeof createSnapshot>

function createShapeSnapshot(editor: Editor, shape: TLShape) {
	const pageTransform = editor.getShapePageTransform(shape)!
	const util = editor.getShapeUtil(shape)

	return {
		shape,
		bounds: editor.getShapeGeometry(shape).bounds,
		pageTransform,
		pageRotation: Mat.Decompose(pageTransform!).rotation,
		isAspectRatioLocked: util.isAspectRatioLocked(shape),
	}
}

type ShapeSnapshot = ReturnType<typeof createShapeSnapshot>

function getResizingCursor({
	dragHandle,
	isFlippedX,
	isFlippedY,
	rotation,
}: {
	dragHandle: SelectionCorner | SelectionEdge
	isFlippedX: boolean
	isFlippedY: boolean
	rotation: number
}) {
	const nextCursor = { type: 'cross', rotation: 0 }

	switch (dragHandle) {
		case 'top_left':
		case 'bottom_right': {
			nextCursor.type = 'nwse-resize'
			if (isFlippedX !== isFlippedY) {
				nextCursor.type = 'nesw-resize'
			}
			break
		}
		case 'top_right':
		case 'bottom_left': {
			nextCursor.type = 'nesw-resize'
			if (isFlippedX !== isFlippedY) {
				nextCursor.type = 'nwse-resize'
			}
			break
		}
	}

	nextCursor.rotation = rotation

	return nextCursor
}
