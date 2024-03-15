import {
	Interaction,
	TLArrowShape,
	TLArrowShapeTerminal,
	TLHandle,
	TLShapeId,
	TLShapePartial,
	Vec,
	snapAngle,
	sortByIndex,
	structuredClone,
} from '@tldraw/editor'

export class TranslatingArrowTerminalInteraction extends Interaction<{
	isCreating: boolean
	shape: TLArrowShape
	handle: TLHandle
}> {
	id = 'translating_arrow_terminal'
	markId = ''
	initialPageRotation = 0
	initialPagePoint = {} as Vec

	initialHandle = {} as TLHandle
	initialOppositeHandle = {} as TLHandle

	isPrecise = false
	isPreciseId: TLShapeId | null = null
	pointingId: TLShapeId | null = null

	didTranslate = false

	override onStart() {
		const { shape, handle } = this.info
		this.initialHandle = structuredClone(handle)

		this.initialPageRotation = this.editor.getShapePageTransform(shape)!.rotation()
		this.initialPagePoint = this.editor.inputs.originPagePoint.clone()

		const handles = this.editor.getShapeHandles(shape)!.sort(sortByIndex)
		this.initialOppositeHandle = handle.id === 'start' ? handles[2] : handles[0]

		const initialTerminal = shape.props[handle.id as 'start' | 'end']

		this.isPrecise = false

		if (initialTerminal?.type === 'binding') {
			this.editor.setHintingShapes([initialTerminal.boundShapeId])

			this.isPrecise = initialTerminal.isPrecise
			if (this.isPrecise) {
				this.isPreciseId = initialTerminal.boundShapeId
			} else {
				this.resetExactTimeout()
			}
		}
	}

	override onUpdate() {
		const {
			editor,
			info: { shape: initialShape },
			initialPagePoint,
		} = this

		if (!editor.inputs.isPointing) {
			this.complete()
			return
		}

		this.updateExact()

		if (editor.inputs.isDragging) {
			if (this.didTranslate) {
				this.didTranslate = true
			}
		} else {
			// noop
			return
		}

		const { initialHandle, initialPageRotation, initialOppositeHandle } = this
		const hintingShapeIds = this.editor.getHintingShapeIds()
		const isSnapMode = this.editor.user.getIsSnapMode()
		const {
			snaps,
			inputs: { currentPagePoint, shiftKey, ctrlKey, altKey, pointerVelocity },
		} = editor

		const shape = editor.getShape(initialShape)
		if (!shape) return
		const util = editor.getShapeUtil(shape)

		let point = currentPagePoint
			.clone()
			.sub(initialPagePoint)
			.rot(-initialPageRotation)
			.add(initialHandle)

		if (shiftKey && initialOppositeHandle) {
			const angle = Vec.Angle(initialOppositeHandle, point)
			const snappedAngle = snapAngle(angle, 24)
			const angleDifference = snappedAngle - angle
			point = Vec.RotWith(point, initialOppositeHandle, angleDifference)
		}

		// Clear any existing snaps
		editor.snaps.clearIndicators()

		let nextHandle = { ...initialHandle, x: point.x, y: point.y }

		if (initialHandle.canSnap && (isSnapMode ? !ctrlKey : ctrlKey)) {
			// We're snapping
			const pageTransform = editor.getShapePageTransform(shape.id)
			if (!pageTransform) throw Error('Expected a page transform')

			const snap = snaps.handles.snapHandle({ currentShapeId: shape.id, handle: nextHandle })

			if (snap) {
				snap.nudge.rot(-editor.getShapeParentTransform(shape)!.rotation())
				point.add(snap.nudge)
				nextHandle = { ...initialHandle, x: point.x, y: point.y }
			}
		}

		const changes = util.onHandleDrag?.(shape, {
			handle: nextHandle,
			isPrecise: this.isPrecise || altKey,
			initial: initialShape,
		})

		const next: TLShapePartial<any> = { ...shape, ...changes }

		const bindingAfter = (next.props as any)[initialHandle.id] as TLArrowShapeTerminal | undefined

		if (bindingAfter?.type === 'binding') {
			if (hintingShapeIds[0] !== bindingAfter.boundShapeId) {
				editor.setHintingShapes([bindingAfter.boundShapeId])
				this.pointingId = bindingAfter.boundShapeId
				this.isPrecise = pointerVelocity.len() < 0.5 || altKey
				this.isPreciseId = this.isPrecise ? bindingAfter.boundShapeId : null
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

		if (changes) {
			editor.updateShapes([next], { squashing: true })
		}
	}

	override onCancel() {
		this.editor.bailToMark(this.markId)
	}

	override onEnd() {
		this.editor.setHintingShapes([])
		this.editor.snaps.clearIndicators()
	}

	private exactTimeoutStart = this.duration

	private updateExact() {
		if (this.isPrecise) return

		if (this.duration - this.exactTimeoutStart >= 750) {
			this.isPrecise = true
			this.isPreciseId = this.pointingId
		}
	}

	private resetExactTimeout() {
		this.exactTimeoutStart = this.duration
	}
}
