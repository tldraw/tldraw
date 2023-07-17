import {
	StateNode,
	TLEventHandlers,
	TLInterruptEvent,
	TLNoteShape,
	TLPointerEventInfo,
	createShapeId,
} from '@tldraw/editor'

export class Pointing extends StateNode {
	static override id = 'pointing'

	dragged = false

	info = {} as TLPointerEventInfo

	wasFocusedOnEnter = false

	markPointId = 'creating'

	override onEnter = () => {
		this.wasFocusedOnEnter = !this.editor.isMenuOpen
	}

	override onPointerMove: TLEventHandlers['onPointerMove'] = (info) => {
		if (this.editor.inputs.isDragging) {
			this.editor.mark(this.markPointId)
			const shape = this.createShape()
			if (!shape) return

			this.editor.setCurrentTool('select.translating', {
				...info,
				target: 'shape',
				shape,
				isCreating: true,
				editAfterComplete: true,
				onInteractionEnd: 'note',
			})
		}
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.complete()
	}

	override onInterrupt: TLInterruptEvent = () => {
		this.cancel()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.complete()
	}

	override onCancel: TLEventHandlers['onCancel'] = () => {
		this.cancel()
	}

	private complete() {
		if (!this.wasFocusedOnEnter) {
			return
		}

		this.editor.mark(this.markPointId)
		const shape = this.createShape()

		if (this.editor.instanceState.isToolLocked) {
			this.parent.transition('idle', {})
		} else {
			if (!shape) return

			this.editor.setEditingId(shape.id)
			this.editor.setCurrentTool('select.editing_shape', {
				...this.info,
				target: 'shape',
				shape,
			})
		}
	}

	private cancel() {
		this.editor.bailToMark(this.markPointId)
		this.parent.transition('idle', this.info)
	}

	private createShape() {
		const {
			inputs: { originPagePoint },
		} = this.editor

		const id = createShapeId()

		this.editor.createShapes(
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

		const shape = this.editor.getShapeById<TLNoteShape>(id)!
		const bounds = this.editor.getBounds(shape)

		// Center the text around the created point
		this.editor.updateShapes([
			{
				id,
				type: 'note',
				x: shape.x - bounds.width / 2,
				y: shape.y - bounds.height / 2,
			},
		])

		return this.editor.getShapeById(id)
	}
}
