import {
	Interaction,
	TLHandle,
	TLShape,
	TLShapePartial,
	Vec,
	snapAngle,
	sortByIndex,
	structuredClone,
} from '@tldraw/editor'

export class DraggingHandleInteraction extends Interaction<{
	isCreating: boolean
	shape: TLShape
	handle: TLHandle
}> {
	id = 'dragging_handle'
	initialPageRotation = 0
	initialPagePoint = {} as Vec

	initialHandle = {} as TLHandle
	initialAdjacentHandle = null as TLHandle | null

	didDrag = false

	override onStart() {
		const { shape, handle } = this.info

		this.initialPageRotation = this.editor.getShapePageTransform(shape)!.rotation()
		this.initialPagePoint = this.editor.inputs.originPagePoint.clone()

		if (handle.type === 'create') {
			const util = this.editor.getShapeUtil(shape)
			const change = util.onHandleDrag?.(shape, {
				handle: { ...handle, type: 'vertex' },
				isPrecise: false,
				initial: shape,
			})

			if (change) {
				this.editor.updateShape({ ...shape, ...change })
				const handlesAfter = this.editor.getShapeHandles(shape)!
				const handleAfter = handlesAfter.find((h) => h.index === handle.index)!
				this.initialHandle = structuredClone(handleAfter)
			}
		} else {
			this.initialHandle = structuredClone(handle)
		}

		const handles = this.editor.getShapeHandles(shape.id)
		if (!handles) throw Error('Expected handles')
		const index = handles.sort(sortByIndex).findIndex((h) => h.id === this.initialHandle.id)

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
			if (this.didDrag) {
				this.didDrag = true
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

		const shape = editor.getShape(initialShape)
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
			const next: TLShapePartial = { ...shape, ...changes }
			editor.updateShapes([next], { squashing: true })
		}
	}

	override onEnd() {
		this.editor.setHintingShapes([])
		this.editor.snaps.clearIndicators()
	}
}
