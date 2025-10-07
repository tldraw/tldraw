import { StateNode, TLRulerShape, createShapeId, maybeSnapToGrid } from '@tldraw/editor'

export class Pointing extends StateNode {
	static override id = 'pointing'

	shape = {} as TLRulerShape

	markId: string | undefined

	override onEnter() {
		const { inputs } = this.editor
		const { currentPagePoint } = inputs

		this.markId = undefined

		const id = createShapeId()

		this.markId = this.editor.markHistoryStoppingPoint(`creating_ruler:${id}`)

		const snappedPoint = maybeSnapToGrid(currentPagePoint, this.editor)

		this.editor.createShapes<TLRulerShape>([
			{
				id,
				type: 'ruler',
				x: snappedPoint.x,
				y: snappedPoint.y,
				props: {
					w: 0.1,
					h: 0.1,
					scale: this.editor.user.getIsDynamicResizeMode() ? 1 / this.editor.getZoomLevel() : 1,
				},
			},
		])

		if (!this.editor.getShape(id)) {
			this.cancel()
			return
		}

		this.editor.select(id)
		this.shape = this.editor.getShape(id)!
	}

	override onPointerMove() {
		if (!this.shape) return

		if (this.editor.inputs.isDragging) {
			const handles = this.editor.getShapeHandles(this.shape)
			if (!handles) {
				if (this.markId) this.editor.bailToMark(this.markId)
				throw Error('No handles found')
			}

			const endHandle = handles.find((h) => h.id === 'end')
			if (!endHandle) {
				if (this.markId) this.editor.bailToMark(this.markId)
				throw Error('End handle not found')
			}

			this.editor.setCurrentTool('select.dragging_handle', {
				shape: this.shape,
				isCreating: true,
				creatingMarkId: this.markId,
				handle: endHandle,
				onInteractionEnd: 'ruler',
			})
		}
	}

	override onPointerUp() {
		// Always delete the ruler on mouse up
		this.cancel()
	}

	override onCancel() {
		this.cancel()
	}

	override onComplete() {
		this.complete()
	}

	override onInterrupt() {
		this.parent.transition('idle')
		if (this.markId) this.editor.bailToMark(this.markId)
		this.editor.snaps.clearIndicators()
	}

	complete() {
		this.parent.transition('idle')
		this.editor.snaps.clearIndicators()
	}

	cancel() {
		if (this.markId) this.editor.bailToMark(this.markId)
		this.parent.transition('idle')
		this.editor.snaps.clearIndicators()
	}
}
