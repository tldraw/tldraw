import {
	Editor,
	Mat,
	TLHandle,
	TLNoteShape,
	TLPointerEventInfo,
	TLShape,
	TLShapeId,
	TLShapePartial,
	Vec,
	kickoutOccludedShapes,
	snapAngle,
	sortByIndex,
	structuredClone,
	warnOnce,
} from '@tldraw/editor'
import { ArrowShapeUtil } from '../shapes/arrow/ArrowShapeUtil'
import { clearArrowTargetState, updateArrowTargetState } from '../shapes/arrow/arrowTargetState'
import { getArrowBindings } from '../shapes/arrow/shared'
import {
	getNoteAdjacentPositions,
	getNoteShapeForAdjacentPosition,
} from '../shapes/note/noteHelpers'
import type { NoteShapeUtil } from '../shapes/note/NoteShapeUtil'
import { getDisplayValues } from '../shapes/shared/getDisplayValues'
import { startEditingShapeWithRichText } from '../tools/SelectTool/selectHelpers'

export type ShapeHandlePointingInfo = TLPointerEventInfo & {
	target: 'handle'
	shape: TLShape
	handle: TLHandle
}

export type ShapeHandleDragInfo = ShapeHandlePointingInfo & {
	onInteractionEnd?: string | (() => void)
	isCreating?: boolean
	creatingMarkId?: string
}

export class ShapeHandlePointingSession {
	readonly info: ShapeHandlePointingInfo
	private didCtrlOnEnter = false

	constructor(
		private readonly editor: Editor,
		info: ShapeHandlePointingInfo
	) {
		this.info = info
	}

	start() {
		this.didCtrlOnEnter = this.info.accelKey

		const { shape, handle } = this.info
		if (this.editor.isShapeOfType(shape, 'arrow') && isArrowEndpointHandle(handle)) {
			const initialBindings = getArrowBindings(this.editor, shape)
			const currentBinding = initialBindings[handle.id]
			const oppositeBinding = initialBindings[handle.id === 'start' ? 'end' : 'start']
			const arrowTransform = this.editor.getShapePageTransform(shape.id)!

			if (currentBinding) {
				updateArrowTargetState({
					editor: this.editor,
					pointInPageSpace: arrowTransform.applyToPoint(handle),
					arrow: shape,
					isPrecise: currentBinding.props.isPrecise,
					currentBinding,
					oppositeBinding,
				})
			}
		}

		this.editor.setCursor({ type: 'grabbing', rotation: 0 })
	}

	getDragStartRedirect(current: TLPointerEventInfo) {
		if (this.editor.getIsReadonly()) return

		if (this.didCtrlOnEnter) {
			return { id: 'select.brushing', info: current }
		}

		return this.getNoteTranslationRedirect()
	}

	click() {
		const { shape, handle } = this.info

		if (this.editor.isShapeOfType(shape, 'note')) {
			const nextNote = getNoteForAdjacentPosition(this.editor, shape, handle, false)
			if (nextNote) {
				startEditingShapeWithRichText(this.editor, nextNote, { selectAll: true })
				return true
			}
		}

		return false
	}

	cleanup() {
		this.editor.setHintingShapes([])
		this.editor.setCursor({ type: 'default', rotation: 0 })
	}

	private getNoteTranslationRedirect() {
		const { editor } = this
		const { shape, handle } = this.info
		if (!editor.isShapeOfType(shape, 'note')) return

		const noteUtil = editor.getShapeUtil(shape) as NoteShapeUtil
		const dv = getDisplayValues(noteUtil, shape)

		const nextNote = getNoteForAdjacentPosition(editor, shape, handle, true)
		if (!nextNote) return

		const centeredOnPointer = editor
			.getPointInParentSpace(nextNote, editor.inputs.getOriginPagePoint())
			.sub(
				Vec.Rot(
					new Vec(dv.noteWidth / 2, dv.noteHeight / 2).mul(shape.props.scale),
					nextNote.rotation
				)
			)
		editor.updateShape({ ...nextNote, x: centeredOnPointer.x, y: centeredOnPointer.y })

		const translatedNote = editor.getShape(nextNote.id)
		if (!translatedNote) return

		editor.setHoveredShape(nextNote.id).select(nextNote.id)

		return {
			id: 'select.translating',
			info: {
				...this.info,
				target: 'shape' as const,
				shape: translatedNote,
				onInteractionEnd: 'note',
				isCreating: true,
				onCreate: () => {
					startEditingShapeWithRichText(editor, nextNote, { selectAll: true })
				},
			},
		}
	}
}

export class ShapeHandleDragSession {
	shapeId!: TLShapeId
	initialHandle!: TLHandle
	initialAdjacentHandle!: TLHandle | null
	initialPagePoint!: Vec

	markId!: string
	initialPageTransform!: Mat
	initialPageRotation!: number

	isPrecise = false
	isPreciseId: TLShapeId | null = null
	pointingId: TLShapeId | null = null

	private exactTimeout = -1
	private isActive = false

	constructor(
		private readonly editor: Editor,
		readonly info: ShapeHandleDragInfo
	) {}

	start({ update = true } = {}) {
		const { shape, isCreating, creatingMarkId, handle } = this.info
		this.isActive = true
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

		const handles = this.editor.getShapeHandles(shape)!.sort(sortByIndex)
		const index = handles.findIndex((h) => h.id === handle.id)

		this.initialAdjacentHandle = null

		if (handle.snapReferenceHandleId) {
			const customHandle = handles.find((h) => h.id === handle.snapReferenceHandleId)
			if (customHandle) {
				this.initialAdjacentHandle = customHandle
			}
		}

		if (!this.initialAdjacentHandle) {
			for (let i = index + 1; i < handles.length; i++) {
				const handle = handles[i]
				if (
					handle.type === 'vertex' &&
					handle.id !== 'middle' &&
					handle.id !== this.info.handle.id
				) {
					this.initialAdjacentHandle = handle
					break
				}
			}

			if (!this.initialAdjacentHandle) {
				for (let i = handles.length - 1; i >= 0; i--) {
					const handle = handles[i]
					if (
						handle.type === 'vertex' &&
						handle.id !== 'middle' &&
						handle.id !== this.info.handle.id
					) {
						this.initialAdjacentHandle = handle
						break
					}
				}
			}
		}

		if (this.editor.isShapeOfType(shape, 'arrow') && isArrowEndpointHandle(handle)) {
			const initialBinding = getArrowBindings(this.editor, shape)[handle.id]

			this.isPrecise = false

			if (initialBinding) {
				this.isPrecise = initialBinding.props.isPrecise
				if (this.isPrecise) {
					this.isPreciseId = initialBinding.toId
				} else {
					this.resetExactTimeout()
				}
			}
		}

		const handleDragInfo = {
			handle: this.initialHandle,
			isPrecise: this.isPrecise,
			isCreatingShape: !!this.info.isCreating,
			initial: shape,
		}
		const util = this.editor.getShapeUtil(shape)
		const startChanges = util.onHandleDragStart?.(shape, handleDragInfo)
		if (startChanges) {
			const next: TLShapePartial<any> = { ...startChanges, id: shape.id, type: shape.type }
			this.editor.updateShapes([next])
		}

		if (update) {
			this.update()
		}

		this.editor.select(this.shapeId)
	}

	update() {
		const { editor, shapeId, initialPagePoint } = this
		const { initialHandle, initialPageRotation, initialAdjacentHandle } = this
		const isSnapMode = this.editor.user.getIsSnapMode()
		const { snaps } = editor
		const currentPagePoint = editor.inputs.getCurrentPagePoint()
		const shiftKey = editor.inputs.getShiftKey()
		const ctrlKey = editor.inputs.getCtrlKey()
		const altKey = editor.inputs.getAltKey()
		const pointerVelocity = editor.inputs.getPointerVelocity()

		const initial = this.info.shape

		const shape = editor.getShape(shapeId)
		if (!shape) return
		const util = editor.getShapeUtil(shape)

		const initialBinding =
			editor.isShapeOfType(shape, 'arrow') && isArrowEndpointHandle(initialHandle)
				? getArrowBindings(editor, shape)[initialHandle.id]
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

		if (canSnap && (isSnapMode ? !ctrlKey : ctrlKey)) {
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
			isCreatingShape: !!this.info.isCreating,
			initial,
		})

		const next: TLShapePartial<any> = { id: shape.id, type: shape.type, ...changes }

		if (
			initialHandle.type === 'vertex' &&
			editor.isShapeOfType(shape, 'arrow') &&
			isArrowEndpointHandle(initialHandle)
		) {
			const bindingAfter = getArrowBindings(editor, shape)[initialHandle.id]

			if (bindingAfter) {
				if (initialBinding?.toId !== bindingAfter.toId) {
					this.pointingId = bindingAfter.toId
					this.isPrecise = pointerVelocity.len() < 0.5 || altKey
					this.isPreciseId = this.isPrecise ? bindingAfter.toId : null
					this.resetExactTimeout()
				}
			} else if (initialBinding) {
				this.pointingId = null
				this.isPrecise = false
				this.isPreciseId = null
				this.resetExactTimeout()
			}
		}

		if (changes) {
			editor.updateShapes([next])
		}
	}

	complete() {
		this.editor.snaps.clearIndicators()
		kickoutOccludedShapes(this.editor, [this.shapeId])

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

		return this.handleCompleteInteractionEnd()
	}

	cancel() {
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

		return this.handleCancelInteractionEnd()
	}

	exit() {
		this.isActive = false
		this.clearExactTimeout()
		clearArrowTargetState(this.editor)
		this.editor.snaps.clearIndicators()
		this.editor.setCursor({ type: 'default', rotation: 0 })
	}

	private handleCompleteInteractionEnd() {
		const { onInteractionEnd } = this.info
		if (onInteractionEnd) {
			if (typeof onInteractionEnd === 'string') {
				if (this.editor.getInstanceState().isToolLocked) {
					this.editor.setCurrentTool(onInteractionEnd, { shapeId: this.shapeId })
					return true
				}
			} else {
				onInteractionEnd()
				return true
			}
		}

		return false
	}

	private handleCancelInteractionEnd() {
		const { onInteractionEnd } = this.info
		if (onInteractionEnd) {
			if (typeof onInteractionEnd === 'string') {
				this.editor.setCurrentTool(onInteractionEnd, { shapeId: this.shapeId })
			} else {
				onInteractionEnd()
			}
			return true
		}

		return false
	}

	private resetExactTimeout() {
		const arrowUtil = this.editor.getShapeUtil<ArrowShapeUtil>('arrow')
		const timeoutValue = arrowUtil.options.pointingPreciseTimeout

		if (this.exactTimeout !== -1) {
			this.clearExactTimeout()
		}

		this.exactTimeout = this.editor.timers.setTimeout(() => {
			if (this.isActive && !this.isPrecise) {
				this.isPrecise = true
				this.isPreciseId = this.pointingId
				this.update()
			}
			this.exactTimeout = -1
		}, timeoutValue)
	}

	private clearExactTimeout() {
		if (this.exactTimeout !== -1) {
			clearTimeout(this.exactTimeout)
			this.exactTimeout = -1
		}
	}
}

function isArrowEndpointHandle(handle: TLHandle): handle is TLHandle & { id: 'start' | 'end' } {
	return handle.id === 'start' || handle.id === 'end'
}

function getNoteForAdjacentPosition(
	editor: Editor,
	shape: TLNoteShape,
	handle: TLHandle,
	forceNew: boolean
) {
	const noteUtil = editor.getShapeUtil(shape) as NoteShapeUtil
	const dv = getDisplayValues(noteUtil, shape)

	const pageTransform = editor.getShapePageTransform(shape.id)!
	const pagePoint = pageTransform.point()
	const pageRotation = pageTransform.rotation()
	const positions = getNoteAdjacentPositions(editor, {
		pagePoint,
		pageRotation,
		growY: shape.props.growY * shape.props.scale,
		extraHeight: 0,
		scale: shape.props.scale,
		noteWidth: dv.noteWidth,
		noteHeight: dv.noteHeight,
	})
	const position = positions[handle.index]
	if (position) {
		return getNoteShapeForAdjacentPosition(editor, {
			shape,
			center: position,
			pageRotation,
			noteWidth: dv.noteWidth,
			noteHeight: dv.noteHeight,
			forceNew,
		})
	}
	return undefined
}
