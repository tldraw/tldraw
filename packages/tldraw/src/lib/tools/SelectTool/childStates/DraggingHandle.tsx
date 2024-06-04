import {
	StateNode,
	TLArrowShape,
	TLCancelEvent,
	TLEnterEventHandler,
	TLEventHandlers,
	TLHandle,
	TLKeyboardEvent,
	TLLineShape,
	TLPointerEventInfo,
	TLShapeId,
	TLShapePartial,
	Vec,
	snapAngle,
	sortByIndex,
	structuredClone,
} from '@tldraw/editor'
import { getArrowBindings } from '../../../shapes/arrow/shared'
import { kickoutOccludedShapes } from '../selectHelpers'

export class DraggingHandle extends StateNode {
	static override id = 'dragging_handle'

	shapeId = '' as TLShapeId
	initialHandle = {} as TLHandle
	initialAdjacentHandle = null as TLHandle | null
	initialPagePoint = {} as Vec

	markId = ''
	initialPageTransform: any
	initialPageRotation: any

	info = {} as TLPointerEventInfo & {
		shape: TLArrowShape | TLLineShape
		target: 'handle'
		onInteractionEnd?: string
		isCreating: boolean
	}

	isPrecise = false
	isPreciseId = null as TLShapeId | null
	pointingId = null as TLShapeId | null

	override onEnter: TLEnterEventHandler = (
		info: TLPointerEventInfo & {
			shape: TLArrowShape | TLLineShape
			target: 'handle'
			onInteractionEnd?: string
			isCreating: boolean
		}
	) => {
		const { shape, isCreating, handle } = info
		this.info = info
		this.parent.setCurrentToolIdMask(info.onInteractionEnd)
		this.shapeId = shape.id
		this.markId = isCreating ? `creating:${shape.id}` : 'dragging handle'
		if (!isCreating) this.editor.mark(this.markId)

		this.initialHandle = structuredClone(handle)

		if (this.editor.isShapeOfType<TLLineShape>(shape, 'line')) {
			// For line shapes, if we're dragging a "create" handle, then
			// create a new vertex handle at that point; and make this handle
			// the handle that we're dragging.
			if (this.initialHandle.type === 'create') {
				this.editor.updateShape({
					...shape,
					props: {
						points: {
							...shape.props.points,
							[handle.index]: { id: handle.index, index: handle.index, x: handle.x, y: handle.y },
						},
					},
				})
				const handlesAfter = this.editor.getShapeHandles(shape)!
				const handleAfter = handlesAfter.find((h) => h.index === handle.index)!
				this.initialHandle = structuredClone(handleAfter)
			}
		}

		this.initialPageTransform = this.editor.getShapePageTransform(shape)!
		this.initialPageRotation = this.initialPageTransform.rotation()
		this.initialPagePoint = this.editor.inputs.originPagePoint.clone()

		this.editor.setCursor({ type: isCreating ? 'cross' : 'grabbing', rotation: 0 })

		const handles = this.editor.getShapeHandles(shape)!.sort(sortByIndex)
		const index = handles.findIndex((h) => h.id === info.handle.id)

		// Find the adjacent handle
		this.initialAdjacentHandle = null

		// Start from the handle and work forward
		for (let i = index + 1; i < handles.length; i++) {
			const handle = handles[i]
			if (handle.type === 'vertex' && handle.id !== 'middle' && handle.id !== info.handle.id) {
				this.initialAdjacentHandle = handle
				break
			}
		}

		// If still no handle, start from the end and work backward
		if (!this.initialAdjacentHandle) {
			for (let i = handles.length - 1; i >= 0; i--) {
				const handle = handles[i]
				if (handle.type === 'vertex' && handle.id !== 'middle' && handle.id !== info.handle.id) {
					this.initialAdjacentHandle = handle
					break
				}
			}
		}

		// <!-- Only relevant to arrows
		if (this.editor.isShapeOfType<TLArrowShape>(shape, 'arrow')) {
			const initialBinding = getArrowBindings(this.editor, shape)[info.handle.id as 'start' | 'end']

			this.isPrecise = false

			if (initialBinding) {
				this.editor.setHintingShapes([initialBinding.toId])

				this.isPrecise = initialBinding.props.isPrecise
				if (this.isPrecise) {
					this.isPreciseId = initialBinding.toId
				} else {
					this.resetExactTimeout()
				}
			} else {
				this.editor.setHintingShapes([])
			}
		}
		// -->

		this.update()

		this.editor.select(this.shapeId)
	}

	// Only relevant to arrows
	private exactTimeout = -1 as any

	// Only relevant to arrows
	private resetExactTimeout() {
		if (this.exactTimeout !== -1) {
			this.clearExactTimeout()
		}

		this.exactTimeout = this.editor.timers.setTimeout(() => {
			if (this.getIsActive() && !this.isPrecise) {
				this.isPrecise = true
				this.isPreciseId = this.pointingId
				this.update()
			}
			this.exactTimeout = -1
		}, 750)
	}

	// Only relevant to arrows
	private clearExactTimeout() {
		if (this.exactTimeout !== -1) {
			clearTimeout(this.exactTimeout)
			this.exactTimeout = -1
		}
	}

	override onPointerMove: TLEventHandlers['onPointerMove'] = () => {
		this.update()
	}

	override onKeyDown: TLKeyboardEvent | undefined = () => {
		this.update()
	}

	override onKeyUp: TLKeyboardEvent | undefined = () => {
		this.update()
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.complete()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.update()
		this.complete()
	}

	override onCancel: TLCancelEvent = () => {
		this.cancel()
	}

	override onExit = () => {
		this.parent.setCurrentToolIdMask(undefined)
		this.editor.setHintingShapes([])
		this.editor.snaps.clearIndicators()

		this.editor.setCursor({ type: 'default', rotation: 0 })
	}

	private complete() {
		this.editor.snaps.clearIndicators()
		kickoutOccludedShapes(this.editor, [this.shapeId])

		const { onInteractionEnd } = this.info
		if (this.editor.getInstanceState().isToolLocked && onInteractionEnd) {
			// Return to the tool that was active before this one,
			// but only if tool lock is turned on!
			this.editor.setCurrentTool(onInteractionEnd, { shapeId: this.shapeId })
			return
		}

		this.parent.transition('idle')
	}

	private cancel() {
		this.editor.bailToMark(this.markId)
		this.editor.snaps.clearIndicators()

		const { onInteractionEnd } = this.info
		if (onInteractionEnd) {
			// Return to the tool that was active before this one,
			// whether tool lock is turned on or not!
			this.editor.setCurrentTool(onInteractionEnd, { shapeId: this.shapeId })
			return
		}

		this.parent.transition('idle')
	}

	private update() {
		const { editor, shapeId, initialPagePoint } = this
		const { initialHandle, initialPageRotation, initialAdjacentHandle } = this
		const hintingShapeIds = this.editor.getHintingShapeIds()
		const isSnapMode = this.editor.user.getIsSnapMode()
		const {
			snaps,
			inputs: { currentPagePoint, shiftKey, ctrlKey, altKey, pointerVelocity },
		} = editor

		const initial = this.info.shape

		const shape = editor.getShape(shapeId)
		if (!shape) return
		const util = editor.getShapeUtil(shape)

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

		if (initialHandle.canSnap && (isSnapMode ? !ctrlKey : ctrlKey)) {
			// We're snapping
			const pageTransform = editor.getShapePageTransform(shape.id)
			if (!pageTransform) throw Error('Expected a page transform')

			const snap = snaps.handles.snapHandle({ currentShapeId: shapeId, handle: nextHandle })

			if (snap) {
				snap.nudge.rot(-editor.getShapeParentTransform(shape)!.rotation())
				point.add(snap.nudge)
				nextHandle = { ...initialHandle, x: point.x, y: point.y }
			}
		}

		const changes = util.onHandleDrag?.(shape, {
			handle: nextHandle,
			isPrecise: this.isPrecise || altKey,
			initial: initial,
		})

		const next: TLShapePartial<any> = { id: shape.id, type: shape.type, ...changes }

		// Arrows
		if (
			initialHandle.type === 'vertex' &&
			this.editor.isShapeOfType<TLArrowShape>(shape, 'arrow')
		) {
			const bindingAfter = getArrowBindings(editor, shape)[initialHandle.id as 'start' | 'end']

			if (bindingAfter) {
				if (hintingShapeIds[0] !== bindingAfter.toId) {
					editor.setHintingShapes([bindingAfter.toId])
					this.pointingId = bindingAfter.toId
					this.isPrecise = pointerVelocity.len() < 0.5 || altKey
					this.isPreciseId = this.isPrecise ? bindingAfter.toId : null
					this.resetExactTimeout()
				}
			} else {
				if (hintingShapeIds.length > 0) {
					editor.setHintingShapes([])
					this.pointingId = null
					this.isPrecise = false
					this.isPreciseId = null
					this.resetExactTimeout()
				}
			}
		}

		if (changes) {
			editor.updateShapes([next])
		}
	}
}
