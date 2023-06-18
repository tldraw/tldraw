import {
	areAnglesCompatible,
	Matrix2d,
	PI,
	PI2,
	SelectionCorner,
	SelectionEdge,
	TAU,
	Vec2d,
	VecLike,
} from '@tldraw/primitives'
import { TLShape, TLShapeId, TLShapePartial } from '@tldraw/tlschema'
import { FrameShapeUtil } from '../../../shapes/frame/FrameShapeUtil'
import {
	TLEnterEventHandler,
	TLEventHandlers,
	TLPointerEventInfo,
} from '../../../types/event-types'
import { StateNode } from '../../StateNode'

type ResizingInfo = TLPointerEventInfo & {
	target: 'selection'
	handle: SelectionEdge | SelectionCorner
	isCreating?: boolean
	editAfterComplete?: boolean
	creationCursorOffset?: VecLike
	onInteractionEnd?: string
}

export class Resizing extends StateNode {
	static override id = 'resizing'

	info = {} as ResizingInfo

	markId = ''

	// we transition into the resizing state from the geo pointing state, which starts with a shape of size w: 1, h: 1,
	// so if the user drags x: +50, y: +50 after mouseDown, the shape will be w: 51, h: 51, which is too many pixels, alas
	// so we allow passing a further offset into this state to negate such issues
	creationCursorOffset = { x: 0, y: 0 } as VecLike
	editAfterComplete = false

	private snapshot = {} as any as Snapshot

	onEnter: TLEnterEventHandler = (info: ResizingInfo) => {
		const {
			isCreating = false,
			editAfterComplete = false,
			creationCursorOffset = { x: 0, y: 0 },
		} = info

		this.info = info
		this.editAfterComplete = editAfterComplete
		this.creationCursorOffset = creationCursorOffset

		if (info.isCreating) {
			this.editor.setCursor({ type: 'cross', rotation: 0 })
		}

		this.snapshot = this._createSnapshot()
		this.markId = isCreating ? 'creating' : this.editor.mark('starting resizing')

		this.handleResizeStart()
		this.updateShapes()
	}

	onPointerMove: TLEventHandlers['onPointerMove'] = () => {
		this.updateShapes()
	}

	onKeyDown: TLEventHandlers['onKeyDown'] = () => {
		this.updateShapes()
	}
	onKeyUp: TLEventHandlers['onKeyUp'] = () => {
		this.updateShapes()
	}

	onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.complete()
	}

	onComplete: TLEventHandlers['onComplete'] = () => {
		this.complete()
	}

	onCancel: TLEventHandlers['onCancel'] = () => {
		this.cancel()
	}

	private cancel() {
		// Restore initial models
		this.editor.bailToMark(this.markId)
		if (this.info.onInteractionEnd) {
			this.editor.setSelectedTool(this.info.onInteractionEnd, {})
		} else {
			this.parent.transition('idle', {})
		}
	}

	private complete() {
		this.handleResizeEnd()

		if (this.editAfterComplete && this.editor.onlySelectedShape) {
			this.editor.setEditingId(this.editor.onlySelectedShape.id)
			this.editor.setSelectedTool('select')
			this.editor.root.current.value!.transition('editing_shape', {})
			return
		}

		if (this.editor.instanceState.isToolLocked && this.info.onInteractionEnd) {
			this.editor.setSelectedTool(this.info.onInteractionEnd, {})
			return
		}

		this.parent.transition('idle', {})
	}

	private handleResizeStart() {
		const { shapeSnapshots } = this.snapshot

		const changes: TLShapePartial[] = []

		shapeSnapshots.forEach(({ shape }) => {
			const util = this.editor.getShapeUtil(shape)
			const change = util.onResizeStart?.(shape)
			if (change) {
				changes.push(change)
			}
		})

		if (changes.length > 0) {
			this.editor.updateShapes(changes)
		}
	}

	private handleResizeEnd() {
		const { shapeSnapshots } = this.snapshot

		const changes: TLShapePartial[] = []

		shapeSnapshots.forEach(({ shape }) => {
			const current = this.editor.getShapeById(shape.id)!
			const util = this.editor.getShapeUtil(shape)
			const change = util.onResizeEnd?.(shape, current)
			if (change) {
				changes.push(change)
			}
		})

		if (changes.length > 0) {
			this.editor.updateShapes(changes)
		}
	}

	private updateShapes() {
		const { altKey, shiftKey } = this.editor.inputs
		const {
			shapeSnapshots,
			selectionBounds,
			cursorHandleOffset,
			selectedIds,
			selectionRotation,
			canShapesDeform,
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

		const { ctrlKey } = this.editor.inputs

		const currentPagePoint = this.editor.inputs.currentPagePoint
			.clone()
			.sub(cursorHandleOffset)
			.sub(this.creationCursorOffset)
		const originPagePoint = this.editor.inputs.originPagePoint.clone().sub(cursorHandleOffset)

		if (this.editor.isGridMode && !ctrlKey) {
			currentPagePoint.snapToGrid(this.editor.gridSize)
		}

		const dragHandle = this.info.handle as SelectionCorner | SelectionEdge
		const scaleOriginHandle = rotateSelectionHandle(dragHandle, Math.PI)

		this.editor.snaps.clear()

		const shouldSnap = this.editor.isSnapMode ? !ctrlKey : ctrlKey

		if (shouldSnap && selectionRotation % TAU === 0) {
			const { nudge } = this.editor.snaps.snapResize({
				dragDelta: Vec2d.Sub(currentPagePoint, originPagePoint),
				initialSelectionPageBounds: this.snapshot.initialSelectionPageBounds,
				handle: rotateSelectionHandle(dragHandle, selectionRotation),
				isAspectRatioLocked,
				isResizingFromCenter: altKey,
			})

			currentPagePoint.add(nudge)
		}

		// get the page point of the selection handle opposite to the drag handle
		// or the center of the selection box if altKey is pressed
		const scaleOriginPage = Vec2d.RotWith(
			altKey ? selectionBounds.center : selectionBounds.getHandlePoint(scaleOriginHandle),
			selectionBounds.point,
			selectionRotation
		)

		// calculate the scale by measuring the current distance between the drag handle and the scale origin
		// and dividing by the original distance between the drag handle and the scale origin

		const distanceFromScaleOriginNow = Vec2d.Sub(currentPagePoint, scaleOriginPage).rot(
			-selectionRotation
		)

		const distanceFromScaleOriginAtStart = Vec2d.Sub(originPagePoint, scaleOriginPage).rot(
			-selectionRotation
		)

		const scale = Vec2d.DivV(distanceFromScaleOriginNow, distanceFromScaleOriginAtStart)

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

		if (!this.info.isCreating) {
			this.updateCursor({
				dragHandle,
				isFlippedX: scale.x < 0,
				isFlippedY: scale.y < 0,
				rotation: selectionRotation,
			})
		}

		for (const id of shapeSnapshots.keys()) {
			const snapshot = shapeSnapshots.get(id)!
			this.editor.resizeShape(id, scale, {
				initialBounds: snapshot.bounds,
				dragHandle,
				initialPageTransform: snapshot.pageTransform,
				initialShape: snapshot.shape,
				mode: selectedIds.length === 1 && id === selectedIds[0] ? 'resize_bounds' : 'scale_shape',
				scaleOrigin: scaleOriginPage,
				scaleAxisRotation: selectionRotation,
			})
		}
	}

	// ---

	private updateCursor({
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
		const nextCursor = { ...this.editor.cursor }

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

		this.editor.setCursor(nextCursor)
	}

	onExit = () => {
		this.editor.snaps.clear()
	}

	_createSnapshot = () => {
		const {
			selectedIds,
			selectionRotation,
			inputs: { originPagePoint },
		} = this.editor

		const selectionBounds = this.editor.selectionBounds!

		const dragHandlePoint = Vec2d.RotWith(
			selectionBounds.getHandlePoint(this.info.handle!),
			selectionBounds.point,
			selectionRotation
		)

		const cursorHandleOffset = Vec2d.Sub(originPagePoint, dragHandlePoint)

		const shapeSnapshots = new Map<TLShapeId, ShapeSnapshot>()

		selectedIds.forEach((id) => {
			const shape = this.editor.getShapeById(id)
			if (shape) {
				shapeSnapshots.set(shape.id, this._createShapeSnapshot(shape))
				if (this.editor.isShapeOfType(shape, FrameShapeUtil) && selectedIds.length === 1) return
				this.editor.visitDescendants(shape.id, (descendantId) => {
					const descendent = this.editor.getShapeById(descendantId)
					if (descendent) {
						shapeSnapshots.set(descendent.id, this._createShapeSnapshot(descendent))
						if (this.editor.isShapeOfType(descendent, FrameShapeUtil)) {
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
			selectedIds,
			canShapesDeform,
			initialSelectionPageBounds: this.editor.selectedPageBounds!,
		}
	}

	_createShapeSnapshot = (shape: TLShape) => {
		const pageTransform = this.editor.getPageTransform(shape)!
		const util = this.editor.getShapeUtil(shape)

		return {
			shape,
			bounds: this.editor.getBounds(shape),
			pageTransform,
			pageRotation: Matrix2d.Decompose(pageTransform!).rotation,
			isAspectRatioLocked: util.isAspectRatioLocked(shape),
		}
	}
}

type Snapshot = ReturnType<Resizing['_createSnapshot']>
type ShapeSnapshot = ReturnType<Resizing['_createShapeSnapshot']>

const ORDERED_SELECTION_HANDLES: (SelectionEdge | SelectionCorner)[] = [
	'top',
	'top_right',
	'right',
	'bottom_right',
	'bottom',
	'bottom_left',
	'left',
	'top_left',
]

export function rotateSelectionHandle(handle: SelectionEdge | SelectionCorner, rotation: number) {
	// first find out how many tau we need to rotate by
	rotation = rotation % PI2
	const numSteps = Math.round(rotation / (PI / 4))

	const currentIndex = ORDERED_SELECTION_HANDLES.indexOf(handle)
	return ORDERED_SELECTION_HANDLES[(currentIndex + numSteps) % ORDERED_SELECTION_HANDLES.length]
}
