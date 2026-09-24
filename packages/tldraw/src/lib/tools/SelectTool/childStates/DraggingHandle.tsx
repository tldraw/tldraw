import {
	Mat,
	StateNode,
	TLArrowShape,
	TLHandle,
	TLLineShape,
	TLPointerEventInfo,
	TLShapeId,
	TLShapePartial,
	Vec,
	kickoutOccludedShapes,
	snapAngle,
	sortByIndex,
	structuredClone,
	warnOnce,
} from '@tldraw/editor'
import { ArrowShapeUtil } from '../../../shapes/arrow/ArrowShapeUtil'
import { clearArrowTargetState } from '../../../shapes/arrow/arrowTargetState'
import { getArrowBindings } from '../../../shapes/arrow/shared'
import { returnToInteractionEnd } from '../selectHelpers'

export type DraggingHandleInfo = TLPointerEventInfo & {
	shape: TLArrowShape | TLLineShape
	target: 'handle'
	onInteractionEnd?: string | (() => void)
	isCreating?: boolean
	creatingMarkId?: string
}

export class DraggingHandle extends StateNode {
	static override id = 'dragging_handle'
	static override trackPerformance = true

	shapeId!: TLShapeId
	initialHandle!: TLHandle
	initialAdjacentHandle!: TLHandle | null
	initialPagePoint!: Vec

	markId!: string
	initialPageTransform!: Mat
	initialPageRotation!: number

	info!: DraggingHandleInfo

	isPrecise = false

	override onEnter(info: DraggingHandleInfo) {
		const { shape, isCreating, creatingMarkId, handle } = info

		// The shape can be deleted (remotely, by undo) between pointer down and the drag
		const handles = this.editor.getShapeHandles(shape)
		if (!handles) {
			this.parent.transition('idle')
			return
		}

		this.info = info
		this.isPrecise = false
		if (typeof info.onInteractionEnd === 'string') {
			this.parent.setCurrentToolIdMask(info.onInteractionEnd)
		}
		this.shapeId = shape.id
		this.markId = ''

		if (isCreating) {
			if (creatingMarkId) {
				this.markId = creatingMarkId
			} else {
				// handle legacy implicit `creating:{shapeId}` marks
				const markId = this.editor.getMarkIdMatching(
					`creating:${this.editor.getOnlySelectedShapeId()}`
				)
				if (markId) {
					this.markId = markId
				}
			}
		} else {
			this.markId = this.editor.markHistoryStoppingPoint('dragging handle')
		}

		this.initialHandle = structuredClone(handle)

		this.initialPageTransform = this.editor.getShapePageTransform(shape)!
		this.initialPageRotation = this.initialPageTransform.rotation()
		this.initialPagePoint = this.editor.inputs.getOriginPagePoint().clone()

		this.editor.setCursor({ type: isCreating ? 'cross' : 'grabbing', rotation: 0 })

		// getShapeHandles is cached; don't sort it in place
		const sortedHandles = handles.slice().sort(sortByIndex)
		const index = sortedHandles.findIndex((h) => h.id === info.handle.id)

		// The adjacent handle is the custom reference handle if one is specified; otherwise the
		// next vertex after this one, wrapping around to the last vertex before it.
		const isAdjacentCandidate = (h: TLHandle) =>
			h.type === 'vertex' && h.id !== 'middle' && h.id !== info.handle.id
		this.initialAdjacentHandle =
			(info.handle.snapReferenceHandleId
				? sortedHandles.find((h) => h.id === info.handle.snapReferenceHandleId)
				: undefined) ??
			sortedHandles.slice(index + 1).find(isAdjacentCandidate) ??
			sortedHandles.slice().reverse().find(isAdjacentCandidate) ??
			null

		if (this.editor.isShapeOfType(shape, 'arrow')) {
			const initialBinding = getArrowBindings(this.editor, shape)[info.handle.id as 'start' | 'end']

			if (initialBinding) {
				this.isPrecise = initialBinding.props.isPrecise
				if (!this.isPrecise) {
					this.resetExactTimeout()
				}
			}
		}

		// Call onHandleDragStart callback
		const handleDragInfo = {
			handle: this.initialHandle,
			isPrecise: this.isPrecise,
			isCreatingShape: !!this.info.isCreating,
			initial: shape,
		}
		const util = this.editor.getShapeUtil(shape)
		const startChanges = util.onHandleDragStart?.(shape, handleDragInfo)
		if (startChanges) {
			this.editor.updateShapes([{ ...startChanges, id: shape.id, type: shape.type }])
		}

		this.update()

		this.editor.select(this.shapeId)
	}

	private exactTimeout = -1

	private resetExactTimeout() {
		const arrowUtil = this.editor.getShapeUtil<ArrowShapeUtil>('arrow')
		const timeoutValue = arrowUtil.options.pointingPreciseTimeout

		this.clearExactTimeout()

		this.exactTimeout = this.editor.timers.setTimeout(() => {
			if (this.getIsActive() && !this.isPrecise) {
				this.isPrecise = true
				this.update()
			}
			this.exactTimeout = -1
		}, timeoutValue)
	}

	private clearExactTimeout() {
		if (this.exactTimeout !== -1) {
			this.editor.timers.clearTimeout(this.exactTimeout)
			this.exactTimeout = -1
		}
	}

	override onPointerMove() {
		this.update()
	}

	override onKeyDown() {
		this.update()
	}

	override onKeyUp() {
		this.update()
	}

	override onPointerUp() {
		this.complete()
	}

	override onComplete() {
		this.update()
		this.complete()
	}

	override onCancel() {
		this.cancel()
	}

	override onExit() {
		this.parent.setCurrentToolIdMask(undefined)
		// Otherwise a timer armed by this drag can flip the next drag to precise
		this.clearExactTimeout()
		clearArrowTargetState(this.editor)
		this.editor.snaps.clearIndicators()

		this.editor.setCursor({ type: 'default', rotation: 0 })
	}

	private complete() {
		this.editor.snaps.clearIndicators()
		kickoutOccludedShapes(this.editor, [this.shapeId])

		// Call onHandleDragEnd callback before state transitions
		const shape = this.editor.getShape(this.shapeId)
		if (shape) {
			const util = this.editor.getShapeUtil(shape)
			const handleDragInfo = {
				handle: this.initialHandle,
				isPrecise: this.isPrecise,
				isCreatingShape: !!this.info.isCreating,
				initial: this.info.shape,
			}
			const endChanges = util.onHandleDragEnd?.(shape, handleDragInfo)
			if (endChanges) {
				this.editor.updateShapes([{ ...endChanges, id: shape.id }])
			}
		}

		// Return to the tool that was active before this one but only if tool lock is turned on!
		if (
			returnToInteractionEnd(
				this.editor,
				this.info.onInteractionEnd,
				{ shapeId: this.shapeId },
				{ onlyIfToolLocked: true }
			)
		)
			return

		this.parent.transition('idle')
	}

	private cancel() {
		// Call onHandleDragCancel callback before bailing to mark
		const shape = this.editor.getShape(this.shapeId)
		if (shape) {
			const util = this.editor.getShapeUtil(shape)
			const handleDragInfo = {
				handle: this.initialHandle,
				isPrecise: this.isPrecise,
				isCreatingShape: !!this.info.isCreating,
				initial: this.info.shape,
			}
			util.onHandleDragCancel?.(shape, handleDragInfo)
		}

		this.editor.bailToMark(this.markId)
		this.editor.snaps.clearIndicators()

		// Return to the tool that was active before this one, whether tool lock is turned on or not!
		if (returnToInteractionEnd(this.editor, this.info.onInteractionEnd, { shapeId: this.shapeId }))
			return

		this.parent.transition('idle')
	}

	private update() {
		const { editor, shapeId, initialPagePoint } = this
		const { initialHandle, initialPageRotation, initialAdjacentHandle } = this
		const isSnapMode = this.editor.user.getIsSnapMode()
		const { snaps } = editor
		const currentPagePoint = editor.inputs.getCurrentPagePoint()
		const shiftKey = editor.inputs.getShiftKey()
		const accelKey = editor.inputs.getAccelKey()
		const altKey = editor.inputs.getAltKey()
		const pointerVelocity = editor.inputs.getPointerVelocity()

		const initial = this.info.shape

		const shape = editor.getShape(shapeId)
		if (!shape) return
		const util = editor.getShapeUtil(shape)

		const initialBinding = editor.isShapeOfType(shape, 'arrow')
			? getArrowBindings(editor, shape)[initialHandle.id as 'start' | 'end']
			: undefined

		let point = currentPagePoint
			.clone()
			.sub(initialPagePoint)
			.rot(-initialPageRotation)
			.add(initialHandle)

		if (shiftKey && initialAdjacentHandle && initialHandle.id !== 'middle') {
			const angle = Vec.Angle(initialAdjacentHandle, point)
			const snappedAngle = snapAngle(angle, 24)
			const angleDifference = snappedAngle - angle
			point = Vec.RotWith(point, initialAdjacentHandle, angleDifference)
		}

		// Clear any existing snaps
		editor.snaps.clearIndicators()

		let nextHandle = { ...initialHandle, x: point.x, y: point.y }

		let canSnap = false
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		if (initialHandle.canSnap && initialHandle.snapType) {
			warnOnce(
				'canSnap is deprecated. Cannot use both canSnap and snapType together - snapping disabled. Please use only snapType.'
			)
		} else {
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			canSnap = initialHandle.canSnap || initialHandle.snapType !== undefined
		}

		if (canSnap && (isSnapMode ? !accelKey : accelKey)) {
			// We're snapping
			const snap = snaps.handles.snapHandle({ currentShapeId: shapeId, handle: nextHandle })

			if (snap) {
				// The nudge is in page space and `point` is in the shape's own space, so the shape's
				// full page rotation (not just its parent's) has to come off
				snap.nudge.rot(-editor.getShapePageTransform(shape.id).rotation())
				point.add(snap.nudge)
				nextHandle = { ...initialHandle, x: point.x, y: point.y }
			}
		}

		const changes = util.onHandleDrag?.(shape, {
			handle: nextHandle,
			isPrecise: this.isPrecise || altKey,
			isCreatingShape: !!this.info.isCreating,
			initial: initial,
		})

		const next: TLShapePartial<any> = { id: shape.id, type: shape.type, ...changes }

		if (initialHandle.type === 'vertex' && this.editor.isShapeOfType(shape, 'arrow')) {
			const bindingAfter = getArrowBindings(editor, shape)[initialHandle.id as 'start' | 'end']

			if (bindingAfter) {
				if (initialBinding?.toId !== bindingAfter.toId) {
					this.isPrecise = pointerVelocity.len() < 0.5 || altKey
					this.resetExactTimeout()
				}
			} else {
				if (initialBinding) {
					this.isPrecise = false
					this.resetExactTimeout()
				}
			}
		}

		if (changes) {
			editor.updateShapes([next])
		}
	}
}
