import { TLShape, createShapeId } from '@tldraw/tlschema'
import { structuredClone } from '@tldraw/utils'
import { Vec } from '../../../../primitives/Vec'
import { TLBaseBoxShape } from '../../../shapes/BaseBoxShapeUtil'
import { TLPointerEventInfo } from '../../../types/event-types'
import { StateNode } from '../../StateNode'
import { BaseBoxShapeTool } from '../BaseBoxShapeTool'

export class Pointing extends StateNode {
	static override id = 'pointing'

	wasFocusedOnEnter = false

	override onEnter() {
		this.wasFocusedOnEnter = !this.editor.menus.hasAnyOpenMenus()
	}

	override onPointerMove(info: TLPointerEventInfo) {
		if (this.editor.inputs.isDragging) {
			const { originPagePoint } = this.editor.inputs

			const shapeType = (this.parent as BaseBoxShapeTool)!.shapeType

			const id = createShapeId()

			const creatingMarkId = this.editor.markHistoryStoppingPoint(`creating_box:${id}`)

			this.editor
				.createShapes<TLBaseBoxShape>([
					{
						id,
						type: shapeType,
						x: originPagePoint.x,
						y: originPagePoint.y,
						props: {
							w: 1,
							h: 1,
						},
					},
				])
				.select(id)

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

		if (!this.wasFocusedOnEnter) {
			return
		}

		const shapeType = (this.parent as BaseBoxShapeTool)!.shapeType as TLBaseBoxShape['type']

		const id = createShapeId()

		this.editor.markHistoryStoppingPoint(`creating_box:${id}`)

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
		next.x = shape.x - delta.x
		next.y = shape.y - delta.y
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
