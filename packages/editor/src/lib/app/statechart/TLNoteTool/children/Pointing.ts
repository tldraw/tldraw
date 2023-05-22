import { TLNoteShape } from '@tldraw/tlschema'
import { TLNoteUtil } from '../../../shapeutils/TLNoteUtil/TLNoteUtil'
import { TLEventHandlers, TLInterruptEvent, TLPointerEventInfo } from '../../../types/event-types'
import { StateNode } from '../../StateNode'

export class Pointing extends StateNode {
	static override id = 'pointing'

	dragged = false

	info = {} as TLPointerEventInfo

	wasFocusedOnEnter = false

	markPointId = 'creating'

	onEnter = () => {
		this.wasFocusedOnEnter = !this.app.isMenuOpen
	}

	onPointerMove: TLEventHandlers['onPointerMove'] = (info) => {
		if (this.app.inputs.isDragging) {
			this.app.mark(this.markPointId)
			const shape = this.createShape()
			if (!shape) return

			this.app.setSelectedTool('select.translating', {
				...info,
				target: 'shape',
				shape,
				isCreating: true,
				editAfterComplete: true,
				onInteractionEnd: 'note',
			})
		}
	}

	onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.complete()
	}

	onInterrupt: TLInterruptEvent = () => {
		this.cancel()
	}

	onComplete: TLEventHandlers['onComplete'] = () => {
		this.complete()
	}

	onCancel: TLEventHandlers['onCancel'] = () => {
		this.cancel()
	}

	private complete() {
		if (!this.wasFocusedOnEnter) {
			return
		}

		this.app.mark(this.markPointId)
		const shape = this.createShape()

		if (this.app.instanceState.isToolLocked) {
			this.parent.transition('idle', {})
		} else {
			if (!shape) return

			this.app.setEditingId(shape.id)
			this.app.setSelectedTool('select.editing_shape', {
				...this.info,
				target: 'shape',
				shape,
			})
		}
	}

	private cancel() {
		this.app.bailToMark(this.markPointId)
		this.parent.transition('idle', this.info)
	}

	private createShape() {
		const {
			inputs: { originPagePoint },
		} = this.app

		const id = this.app.createShapeId()

		this.app.createShapes(
			[
				{
					id,
					type: 'note',
					x: originPagePoint.x,
					y: originPagePoint.y,
				},
			],
			true
		)

		const util = this.app.getShapeUtilByType<TLNoteUtil>('note')
		const shape = this.app.getShapeById<TLNoteShape>(id)!
		const bounds = util.bounds(shape)

		// Center the text around the created point
		this.app.updateShapes([
			{
				id,
				type: 'note',
				x: shape.x - bounds.width / 2,
				y: shape.y - bounds.height / 2,
			},
		])

		return this.app.getShapeById(id)
	}
}
