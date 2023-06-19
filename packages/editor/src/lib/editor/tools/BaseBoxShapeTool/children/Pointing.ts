import { Vec2d } from '@tldraw/primitives'
import { createShapeId } from '@tldraw/tlschema'
import { TLBaseBoxShape } from '../../../shapes/BaseBoxShapeUtil'
import { TLEventHandlers } from '../../../types/event-types'
import { StateNode } from '../../StateNode'
import { BaseBoxShapeTool } from '../BaseBoxShapeTool'

export class Pointing extends StateNode {
	static override id = 'pointing'

	markId = 'creating'

	wasFocusedOnEnter = false

	onEnter = () => {
		const { isMenuOpen } = this.editor
		this.wasFocusedOnEnter = !isMenuOpen
	}

	onPointerMove: TLEventHandlers['onPointerMove'] = (info) => {
		if (this.editor.inputs.isDragging) {
			const { originPagePoint } = this.editor.inputs

			const shapeType = (this.parent as BaseBoxShapeTool)!.shapeType.type as TLBaseBoxShape['type']

			const id = createShapeId()

			this.editor.mark(this.markId)

			this.editor.createShapes<TLBaseBoxShape>(
				[
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
				],
				true
			)
			this.editor.setSelectedTool('select.resizing', {
				...info,
				target: 'selection',
				handle: 'bottom_right',
				isCreating: true,
				creationCursorOffset: { x: 1, y: 1 },
				onInteractionEnd: this.parent.id,
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

	override onInterrupt: TLEventHandlers['onInterrupt'] = () => {
		this.cancel()
	}

	complete() {
		const { originPagePoint } = this.editor.inputs

		if (!this.wasFocusedOnEnter) {
			return
		}

		this.editor.mark(this.markId)

		const shapeType = (this.parent as BaseBoxShapeTool)!.shapeType.type as TLBaseBoxShape['type']

		const id = createShapeId()

		this.editor.mark(this.markId)

		this.editor.createShapes<TLBaseBoxShape>([
			{
				id,
				type: shapeType,
				x: originPagePoint.x,
				y: originPagePoint.y,
			},
		])

		const shape = this.editor.getShapeById<TLBaseBoxShape>(id)!
		const { w, h } = this.editor.getShapeUtil(shape).getDefaultProps() as TLBaseBoxShape['props']
		const delta = this.editor.getDeltaInParentSpace(shape, new Vec2d(w / 2, h / 2))

		this.editor.updateShapes<TLBaseBoxShape>([
			{
				id,
				type: shapeType,
				x: shape.x - delta.x,
				y: shape.y - delta.y,
			},
		])

		this.editor.setSelectedIds([id])

		if (this.editor.instanceState.isToolLocked) {
			this.parent.transition('idle', {})
		} else {
			this.editor.setSelectedTool('select.idle')
		}
	}

	cancel() {
		this.parent.transition('idle', {})
	}
}
