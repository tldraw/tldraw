import {
	StateNode,
	TLEventHandlers,
	TLGeoShape,
	TLInterruptEvent,
	TLNoteShape,
	TLPointerEventInfo,
	createShapeId,
} from '@tldraw/editor'

export class PointingDropZone extends StateNode {
	static override id = 'pointing_drop_zone'

	dragged = false

	info = {} as TLPointerEventInfo

	markId = ''

	dropZoneShape = {} as TLGeoShape | undefined
	shape = {} as TLNoteShape

	override onEnter = (shape: TLGeoShape) => {
		this.dropZoneShape = shape
		this.editor.updateShape({ ...shape, opacity: 0.5 })
	}

	override onPointerMove: TLEventHandlers['onPointerMove'] = (info) => {
		if (this.editor.inputs.isDragging) {
			this.shape = this.createShape()
			this.editor.setCurrentTool('select.translating', {
				...info,
				target: 'shape',
				shape: this.shape,
				onInteractionEnd: 'note',
				isCreating: true,
				onCreate: () => {
					this.editor.setEditingShape(this.shape.id)
					this.editor.setCurrentTool('select.editing_shape')
				},
			})
		}
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.shape = this.createShape()

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
		if (this.editor.getInstanceState().isToolLocked) {
			this.parent.transition('idle')
		} else {
			this.editor.setEditingShape(this.shape.id)
			this.editor.setCurrentTool('select.editing_shape', {
				...this.info,
				target: 'shape',
				shape: this.shape,
			})
		}
	}

	private cancel() {
		this.cleanupDropZone()
		this.parent.transition('idle', this.info)
	}

	private createShape() {
		const id = createShapeId()
		this.markId = `creating:${id}`
		this.editor.mark(this.markId)

		this.editor
			.createShapes([
				{
					id,
					type: 'note',
					x: this.dropZoneShape!.x,
					y: this.dropZoneShape!.y,
				},
			])
			.select(id)

		this.cleanupDropZone()
		return this.editor.getShape<TLNoteShape>(id)!
	}
	private cleanupDropZone() {
		if (this.dropZoneShape) {
			this.editor.deleteShape(this.dropZoneShape.id)
			this.dropZoneShape = undefined
		}
	}
}
