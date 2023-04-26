import { Box2d } from '@tldraw/primitives'
import { TLPeerVideoShape, createShapeId } from '@tldraw/tlschema'
import { TLEventHandlers } from '../../../types/event-types'
import { StateNode } from '../../StateNode'

export class Pointing extends StateNode {
	static override id = 'pointing'

	onPointerMove: TLEventHandlers['onPointerMove'] = (info) => {
		if (this.app.inputs.isDragging) {
			const { originPagePoint } = this.app.inputs

			const id = createShapeId()

			this.app.mark('creating')

			this.app.createShapes([
				{
					id,
					type: 'peer-video',
					x: originPagePoint.x,
					y: originPagePoint.y,
					props: {
						w: 1,
						h: 1,
						userId: this.app.user.id,
					},
				},
			])

			this.app.select(id)
			this.app.setSelectedTool('select.resizing', {
				...info,
				target: 'selection',
				handle: 'bottom_right',
				isCreating: true,
				creationCursorOffset: { x: 1, y: 1 },
				onInteractionEnd: 'peer-video',
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

		const id = createShapeId()

		this.app.mark('creating')

		this.app.createShapes([
			{
				id,
				type: 'peer-video',
				x: originPagePoint.x,
				y: originPagePoint.y,
				props: {
					w: 1,
					h: 1,
					userId: this.app.user.id,
				},
			},
		])

		const shape = this.app.getShapeById<TLPeerVideoShape>(id)!
		if (!shape) return

		const bounds = new Box2d(0, 0, 200, 200)
		const delta = this.app.getDeltaInParentSpace(shape, bounds.center)

		this.app.select(id)
		this.app.updateShapes([
			{
				id: shape.id,
				type: 'peer-video',
				x: shape.x - delta.x,
				y: shape.y - delta.y,
				props: {
					w: bounds.width,
					h: bounds.height,
					userId: this.app.user.id,
				},
			},
		])

		if (this.app.instanceState.isToolLocked) {
			this.parent.transition('idle', {})
		} else {
			this.app.setSelectedTool('select', {})
		}
	}

	cancel() {
		this.parent.transition('idle', {})
	}
}
