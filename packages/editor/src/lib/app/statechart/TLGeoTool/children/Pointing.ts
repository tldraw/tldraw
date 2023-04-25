import { Box2d, getStarBounds } from '@tldraw/primitives'
import { TLGeoShape, createShapeId } from '@tldraw/tlschema'
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
					type: 'geo',
					x: originPagePoint.x,
					y: originPagePoint.y,
					props: {
						w: 1,
						h: 1,
						geo: this.app.instanceState.propsForNextShape.geo,
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
				onInteractionEnd: 'geo',
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
				type: 'geo',
				x: originPagePoint.x,
				y: originPagePoint.y,
				props: {
					geo: this.app.instanceState.propsForNextShape.geo,
					w: 1,
					h: 1,
				},
			},
		])

		const shape = this.app.getShapeById<TLGeoShape>(id)!
		if (!shape) return

		const bounds =
			shape.props.geo === 'star' ? getStarBounds(5, 200, 200) : new Box2d(0, 0, 200, 200)
		const delta = this.app.getDeltaInParentSpace(shape, bounds.center)

		this.app.select(id)
		this.app.updateShapes([
			{
				id: shape.id,
				type: 'geo',
				x: shape.x - delta.x,
				y: shape.y - delta.y,
				props: {
					geo: this.app.instanceState.propsForNextShape.geo,
					w: bounds.width,
					h: bounds.height,
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
