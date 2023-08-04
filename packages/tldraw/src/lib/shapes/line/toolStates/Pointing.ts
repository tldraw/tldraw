import {
	Matrix2d,
	StateNode,
	TLEventHandlers,
	TLHandle,
	TLInterruptEvent,
	TLLineShape,
	TLShapeId,
	Vec2d,
	createShapeId,
	getIndexAbove,
	last,
	sortByIndex,
	structuredClone,
} from '@tldraw/editor'

export class Pointing extends StateNode {
	static override id = 'pointing'

	shape = {} as TLLineShape

	markId: string | undefined

	override onEnter = (info: { shapeId?: TLShapeId }) => {
		const { inputs } = this.editor
		const { currentPagePoint } = inputs

		this.markId = undefined

		const shape = info.shapeId && this.editor.getShape<TLLineShape>(info.shapeId)

		if (shape) {
			this.markId = `creating:${shape.id}`
			this.editor.mark(this.markId)
			this.shape = shape

			if (inputs.shiftKey) {
				const handles = this.editor.getShapeHandles(this.shape)
				if (!handles) return

				const vertexHandles = handles.filter((h) => h.type === 'vertex').sort(sortByIndex)
				const endHandle = vertexHandles[vertexHandles.length - 1]

				const shapePagePoint = Matrix2d.applyToPoint(
					this.editor.getShapeParentTransform(this.shape)!,
					new Vec2d(this.shape.x, this.shape.y)
				)

				let nextEndHandleIndex: string, nextEndHandleId: string, nextEndHandle: TLHandle

				if (vertexHandles.length === 2 && vertexHandles[1].x === 1 && vertexHandles[1].y === 1) {
					nextEndHandleIndex = vertexHandles[1].index
					nextEndHandleId = vertexHandles[1].id
					nextEndHandle = {
						...vertexHandles[1],
						x: currentPagePoint.x - shapePagePoint.x,
						y: currentPagePoint.y - shapePagePoint.y,
					}
				} else {
					nextEndHandleIndex = getIndexAbove(endHandle.index)
					nextEndHandleId = 'handle:' + nextEndHandleIndex
					nextEndHandle = {
						x: currentPagePoint.x - shapePagePoint.x,
						y: currentPagePoint.y - shapePagePoint.y,
						index: nextEndHandleIndex,
						canBind: false,
						type: 'vertex',
						id: nextEndHandleId,
					}
				}

				const nextHandles = structuredClone(this.shape.props.handles)

				nextHandles[nextEndHandle.id] = nextEndHandle

				this.editor.updateShapes([
					{
						id: this.shape.id,
						type: this.shape.type,
						props: {
							handles: nextHandles,
						},
					},
				])
			}
		} else {
			const id = createShapeId()

			this.markId = `creating:${id}`
			this.editor.mark(this.markId)

			this.editor.createShapes<TLLineShape>([
				{
					id,
					type: 'line',
					x: currentPagePoint.x,
					y: currentPagePoint.y,
				},
			])

			this.editor.select(id)
			this.shape = this.editor.getShape(id)!
		}
	}

	override onPointerMove: TLEventHandlers['onPointerMove'] = () => {
		if (!this.shape) return

		if (this.editor.inputs.isDragging) {
			const handles = this.editor.getShapeHandles(this.shape)
			if (!handles) {
				if (this.markId) this.editor.bailToMark(this.markId)
				throw Error('No handles found')
			}

			this.editor.setCurrentTool('select.dragging_handle', {
				shape: this.shape,
				isCreating: true,
				handle: last(handles)!,
				onInteractionEnd: 'line',
			})
		}
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.complete()
	}

	override onCancel: TLEventHandlers['onCancel'] = () => {
		this.cancel()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.complete()
	}

	override onInterrupt: TLInterruptEvent = () => {
		this.parent.transition('idle', {})
		if (this.markId) this.editor.bailToMark(this.markId)
		this.editor.snaps.clear()
	}

	complete() {
		this.parent.transition('idle', { shapeId: this.shape.id })
		this.editor.snaps.clear()
	}

	cancel() {
		if (this.markId) this.editor.bailToMark(this.markId)
		this.parent.transition('idle', { shapeId: this.shape.id })
		this.editor.snaps.clear()
	}
}
