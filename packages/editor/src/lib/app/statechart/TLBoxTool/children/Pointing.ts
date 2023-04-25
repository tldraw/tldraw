import { Vec2d } from '@tldraw/primitives'
import { createShapeId } from '@tldraw/tlschema'
import { TLEventHandlers } from '../../../types/event-types'
import { StateNode } from '../../StateNode'
import { TLBoxLike, TLBoxTool } from '../TLBoxTool'

export class Pointing extends StateNode {
	static override id = 'pointing'

	markId = 'creating'

	wasFocusedOnEnter = false

	onEnter = () => {
		const { isMenuOpen } = this.app
		this.wasFocusedOnEnter = !isMenuOpen
	}

	onPointerMove: TLEventHandlers['onPointerMove'] = (info) => {
		if (this.app.inputs.isDragging) {
			const { originPagePoint } = this.app.inputs

			const shapeType = (this.parent as TLBoxTool)!.shapeType as TLBoxLike['type']

			const id = createShapeId()

			this.app.mark(this.markId)

			this.app.createShapes([
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

			this.app.setSelectedIds([id])
			this.app.setSelectedTool('select.resizing', {
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
		const { originPagePoint } = this.app.inputs

		if (!this.wasFocusedOnEnter) {
			return
		}

		this.app.mark(this.markId)

		const shapeType = (this.parent as TLBoxTool)!.shapeType as TLBoxLike['type']

		const id = createShapeId()

		this.app.mark(this.markId)

		this.app.createShapes([
			{
				id,
				type: shapeType,
				x: originPagePoint.x,
				y: originPagePoint.y,
			},
		])

		const shape = this.app.getShapeById<TLBoxLike>(id)!
		const { w, h } = this.app.getShapeUtil<TLBoxLike>(shape).defaultProps()
		const delta = this.app.getDeltaInParentSpace(shape, new Vec2d(w / 2, h / 2))

		this.app.updateShapes([
			{
				id,
				type: shapeType,
				x: shape.x - delta.x,
				y: shape.y - delta.y,
			},
		])

		this.app.setSelectedIds([id])

		if (this.app.instanceState.isToolLocked) {
			this.parent.transition('idle', {})
		} else {
			this.app.setSelectedTool('select.idle')
		}
	}

	cancel() {
		this.parent.transition('idle', {})
	}
}
