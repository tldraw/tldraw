import { createShapeId, TLTextShape } from '@tldraw/tlschema'
import { TLEventHandlers } from '../../../types/event-types'
import { StateNode } from '../../StateNode'

export class Pointing extends StateNode {
	static override id = 'pointing'

	shape?: TLTextShape

	onExit = () => {
		this.app.setHintingIds([])
	}

	onPointerMove: TLEventHandlers['onPointerMove'] = (info) => {
		if (this.app.inputs.isDragging) {
			const {
				inputs: { originPagePoint },
			} = this.app

			const id = createShapeId()

			this.app.mark('creating')

			this.app.createShapes([
				{
					id,
					type: 'text',
					x: originPagePoint.x,
					y: originPagePoint.y,
					props: {
						text: '',
						autoSize: false,
						w: 20,
					},
				},
			])

			this.app.select(id)

			this.shape = this.app.getShapeById(id)
			if (!this.shape) return

			this.app.setSelectedTool('select.resizing', {
				...info,
				target: 'selection',
				handle: 'right',
				isCreating: true,
				creationCursorOffset: { x: 1, y: 1 },
				editAfterComplete: true,
				onInteractionEnd: 'text',
			})
		}
	}

	onPointerUp = () => {
		this.complete()
	}

	onComplete = () => {
		this.cancel()
	}
	onCancel = () => {
		this.cancel()
	}

	onInterrupt = () => {
		this.cancel()
	}

	complete() {
		this.app.mark('creating text shape')
		const id = createShapeId()
		const { x, y } = this.app.inputs.currentPagePoint
		this.app.createShapes(
			[
				{
					id,
					type: 'text',
					x,
					y,
					props: {
						text: '',
						autoSize: true,
					},
				},
			],
			true
		)

		this.app.setEditingId(id)
		this.app.setSelectedTool('select')
		this.app.root.current.value?.transition('editing_shape', {})
	}

	cancel() {
		this.parent.transition('idle', {})
		this.app.bailToMark('creating')
	}
}
