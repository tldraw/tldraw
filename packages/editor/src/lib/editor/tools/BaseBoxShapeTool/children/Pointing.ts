import { TLShape, createShapeId } from '@tldraw/tlschema'
import { structuredClone } from '@tldraw/utils'
import { Vec } from '../../../../primitives/Vec'
import { Editor } from '../../../Editor'
import { TLBaseBoxShape } from '../../../shapes/BaseBoxShapeUtil'
import { TLPointerEventInfo } from '../../../types/event-types'
import { StateNode } from '../../StateNode'
import { BaseBoxShapeTool } from '../BaseBoxShapeTool'

export class Pointing extends StateNode {
	static override id = 'pointing'

	override onPointerMove(info: TLPointerEventInfo) {
		const { editor } = this
		if (editor.inputs.isDragging) {
			const { originPagePoint } = editor.inputs

			const shapeType = (this.parent as BaseBoxShapeTool)!.shapeType

			const id = createShapeId()

			const creatingMarkId = editor.markHistoryStoppingPoint(`creating_box:${id}`)
			const newPoint = maybeSnapToGrid(originPagePoint, editor)

			// Allow this to trigger the max shapes reached alert
			this.editor.createShapes<TLBaseBoxShape>([
				{
					id,
					type: shapeType,
					x: newPoint.x,
					y: newPoint.y,
					props: {
						w: 1,
						h: 1,
					},
				},
			])
			const shape = editor.getShape(id)
			if (!shape) {
				this.cancel()
				return
			}
			editor.select(id)

			const parent = this.parent as BaseBoxShapeTool
			this.editor.setCurrentTool(
				'select.resizing',
				{
					...info,
					target: 'selection',
					handle: 'bottom_right',
					isCreating: true,
					creatingMarkId,
					creationCursorOffset: { x: 1, y: 1 },
					onInteractionEnd: this.parent.id,
					onCreate: parent.onCreate
						? (shape: TLShape | null) => parent.onCreate?.(shape)
						: undefined,
				} /** satisfies ResizingInfo, defined in main tldraw package 😧 */
			)
		}
	}

	override onPointerUp() {
		this.complete()
	}

	override onCancel() {
		this.cancel()
	}

	override onComplete() {
		this.complete()
	}

	override onInterrupt() {
		this.cancel()
	}

	complete() {
		const { originPagePoint } = this.editor.inputs

		const shapeType = (this.parent as BaseBoxShapeTool)!.shapeType as TLBaseBoxShape['type']

		const id = createShapeId()

		this.editor.markHistoryStoppingPoint(`creating_box:${id}`)

		// Allow this to trigger the max shapes reached alert
		// todo: add scale here when dynamic size is enabled (is this still needed?)
		this.editor.createShapes<TLBaseBoxShape>([
			{
				id,
				type: shapeType,
				x: originPagePoint.x,
				y: originPagePoint.y,
			},
		])

		const shape = this.editor.getShape<TLBaseBoxShape>(id)!
		if (!shape) {
			this.cancel()
			return
		}

		let { w, h } = shape.props
		const delta = new Vec(w / 2, h / 2)
		const parentTransform = this.editor.getShapeParentTransform(shape)
		if (parentTransform) delta.rot(-parentTransform.rotation())
		let scale = 1

		if (this.editor.user.getIsDynamicResizeMode()) {
			scale = 1 / this.editor.getZoomLevel()
			w *= scale
			h *= scale
			delta.mul(scale)
		}

		const next = structuredClone(shape)
		const newPoint = maybeSnapToGrid(new Vec(shape.x - delta.x, shape.y - delta.y), this.editor)
		next.x = newPoint.x
		next.y = newPoint.y
		next.props.w = w
		next.props.h = h

		if ('scale' in shape.props) {
			;(next as TLBaseBoxShape & { props: { scale: number } }).props.scale = scale
		}

		this.editor.updateShape<TLBaseBoxShape>(next)

		this.editor.setSelectedShapes([id])

		if (this.editor.getInstanceState().isToolLocked) {
			this.parent.transition('idle')
		} else {
			this.editor.setCurrentTool('select.idle')
		}
	}

	cancel() {
		this.parent.transition('idle')
	}
}

/**
 * Checks if grid mode is enabled and snaps a point to the grid if so
 *
 * @public
 */
export function maybeSnapToGrid(point: Vec, editor: Editor): Vec {
	const isGridMode = editor.getInstanceState().isGridMode
	const gridSize = editor.getDocumentSettings().gridSize
	if (isGridMode) return point.clone().snapToGrid(gridSize)
	return point.clone()
}
