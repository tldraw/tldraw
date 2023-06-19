import { getIndexAbove, sortByIndex } from '@tldraw/indices'
import { Matrix2d, Vec2d } from '@tldraw/primitives'
import { TLHandle, TLLineShape, TLShapeId, createShapeId } from '@tldraw/tlschema'
import { last, structuredClone } from '@tldraw/utils'
import { StateNode } from '../../../tools/StateNode'
import { TLEventHandlers, TLInterruptEvent } from '../../../types/event-types'

export class Pointing extends StateNode {
	static override id = 'pointing'

	shape = {} as TLLineShape

	markPointId = ''

	onEnter = (info: { shapeId?: TLShapeId }) => {
		const { inputs } = this.editor
		const { currentPagePoint } = inputs

		this.markPointId = this.editor.mark('creating')

		let shapeExists = false
		if (info.shapeId) {
			const shape = this.editor.getShapeById<TLLineShape>(info.shapeId)
			if (shape) {
				shapeExists = true
				this.shape = shape
			}
		}

		// if user is holding shift then we are adding points to an existing line
		if (inputs.shiftKey && shapeExists) {
			const handles = this.editor.getHandles(this.shape)
			if (!handles) return

			const vertexHandles = handles.filter((h) => h.type === 'vertex').sort(sortByIndex)
			const endHandle = vertexHandles[vertexHandles.length - 1]

			const shapePagePoint = Matrix2d.applyToPoint(
				this.editor.getParentTransform(this.shape)!,
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
		} else {
			const id = createShapeId()

			this.editor.createShapes<TLLineShape>([
				{
					id,
					type: 'line',
					x: currentPagePoint.x,
					y: currentPagePoint.y,
				},
			])

			this.editor.select(id)
			this.shape = this.editor.getShapeById(id)!
		}
	}

	onPointerMove: TLEventHandlers['onPointerMove'] = () => {
		if (!this.shape) return

		if (this.editor.inputs.isDragging) {
			const handles = this.editor.getHandles(this.shape)
			if (!handles) {
				this.editor.bailToMark('creating')
				throw Error('No handles found')
			}

			this.editor.setSelectedTool('select.dragging_handle', {
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
		this.editor.bailToMark('creating')
		this.editor.snaps.clear()
	}

	complete() {
		this.parent.transition('idle', { shapeId: this.shape.id })
		this.editor.snaps.clear()
	}

	cancel() {
		this.editor.bailToMark(this.markPointId)
		this.parent.transition('idle', { shapeId: this.shape.id })
		this.editor.snaps.clear()
	}
}
