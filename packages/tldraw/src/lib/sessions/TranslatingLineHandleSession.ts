import {
	Session,
	TLHandle,
	TLLineShape,
	TLShapePartial,
	Vec,
	snapAngle,
	sortByIndex,
	structuredClone,
} from '@tldraw/editor'

export class TranslatingLineHandleSession extends Session<{
	isCreating: boolean
	shape: TLLineShape
	handle: TLHandle
}> {
	id = 'translating_line_handle'
	markId = ''
	initialPageRotation = 0
	initialPagePoint = {} as Vec

	initialHandle = {} as TLHandle
	initialAdjacentHandle = null as TLHandle | null

	didTranslate = false

	override onStart() {
		const { shape, handle } = this.info
		this.initialHandle = structuredClone(handle)

		this.initialPageRotation = this.editor.getShapePageTransform(shape)!.rotation()
		this.initialPagePoint = this.editor.inputs.originPagePoint.clone()

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

		const handles = this.editor.getShapeHandles(shape)!.sort(sortByIndex)
		const index = handles.findIndex((h) => h.id === this.initialHandle.id)

		// Find the adjacent handle
		this.initialAdjacentHandle = null

		// Start from the handle and work forward
		for (let i = index + 1; i < handles.length; i++) {
			const handle = handles[i]
			if (handle.type === 'vertex' && handle.id !== this.initialHandle.id) {
				this.initialAdjacentHandle = handle
				break
			}
		}

		// If still no handle, start from the end and work backward
		if (!this.initialAdjacentHandle) {
			for (let i = handles.length - 1; i >= 0; i--) {
				const handle = handles[i]
				if (handle.type === 'vertex' && handle.id !== this.initialHandle.id) {
					this.initialAdjacentHandle = handle
					break
				}
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

		if (editor.inputs.isDragging) {
			if (this.didTranslate) {
				this.didTranslate = true
			}
		} else {
			// noop
			return
		}

		const { initialHandle, initialPageRotation, initialAdjacentHandle } = this
		const isSnapMode = this.editor.user.getIsSnapMode()
		const {
			snaps,
			inputs: { currentPagePoint, shiftKey, ctrlKey },
		} = editor

		const shape = editor.getShape<TLLineShape>(initialShape)
		if (!shape) return
		const util = editor.getShapeUtil(shape)

		let point = currentPagePoint
			.clone()
			.sub(initialPagePoint)
			.rot(-initialPageRotation)
			.add(initialHandle)

		if (shiftKey && initialAdjacentHandle) {
			const angle = Vec.Angle(initialAdjacentHandle, point)
			const snappedAngle = snapAngle(angle, 24)
			const angleDifference = snappedAngle - angle
			point = Vec.RotWith(point, initialAdjacentHandle, angleDifference)
		}

		editor.snaps.clearIndicators()

		let nextHandle = { ...initialHandle, x: point.x, y: point.y }

		if (isSnapMode ? !ctrlKey : ctrlKey) {
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
			isPrecise: false,
			initial: initialShape,
		})

		if (changes) {
			const next: TLShapePartial<TLLineShape> = { ...shape, ...changes }
			editor.updateShapes([next], { squashing: true })
		}
	}

	override onCancel() {
		this.editor.bailToMark(this.markId)
	}

	override onEnd() {
		this.editor.setHintingShapes([])
		this.editor.snaps.clearIndicators()
		this.editor.setCursor({ type: 'default', rotation: 0 })
	}
}
