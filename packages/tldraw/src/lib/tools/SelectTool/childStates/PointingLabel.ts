import {
	StateNode,
	TLArrowShape,
	TLEventHandlers,
	TLPointerEventInfo,
	TLShapeId,
	TLShapePartial,
	TLUnknownShape,
} from '@tldraw/editor'

export class PointingLabel extends StateNode {
	static override id = 'pointing_label'

	shapeId = '' as TLShapeId
	markId = ''

	private info = {} as TLPointerEventInfo & {
		shape: TLArrowShape
		onInteractionEnd?: string
		isCreating: boolean
	}

	private updateCursor() {
		this.editor.updateInstanceState({
			cursor: {
				type: 'grabbing',
				rotation: 0,
			},
		})
	}

	override onEnter = (
		info: TLPointerEventInfo & {
			shape: TLArrowShape
			onInteractionEnd?: string
			isCreating: boolean
		}
	) => {
		const { shape } = info
		this.parent.setCurrentToolIdMask(info.onInteractionEnd)
		this.info = info
		this.shapeId = shape.id
		this.updateCursor()

		this.markId = 'label-drag start'
		this.editor.mark(this.markId)

		const util = this.editor.getShapeUtil(shape)
		const changes = util.onLabelDragStart?.(shape)

		const next: TLShapePartial<any> = { ...shape, ...changes }

		if (changes) {
			this.editor.updateShapes([next], { squashing: true })
		}

		this.editor.setSelectedShapes([this.shapeId])
	}

	override onExit = () => {
		this.parent.setCurrentToolIdMask(undefined)

		const { editor, shapeId } = this
		const shape = editor.getShape(shapeId) as TLArrowShape | (TLUnknownShape & TLArrowShape)

		if (shape) {
			const util = this.editor.getShapeUtil(shape)
			const changes = util.onLabelDragEnd?.(shape)
			const next: TLShapePartial<any> = { ...shape, ...changes }
			if (changes) {
				this.editor.updateShapes([next], { squashing: true })
			}
		}

		this.editor.updateInstanceState(
			{ cursor: { type: 'default', rotation: 0 } },
			{ ephemeral: true }
		)
	}

	override onPointerMove = () => {
		const { isDragging } = this.editor.inputs

		if (isDragging) {
			const shape = this.editor.getShape(this.shapeId)
			if (!shape) return
			const util = this.editor.getShapeUtil(shape)

			const changes = util.onLabelDrag?.(shape)

			const next: TLShapePartial<any> = { ...shape, ...changes }

			if (changes) {
				this.editor.updateShapes([next], { squashing: true })
			}
		}
	}

	override onPointerUp = () => {
		this.complete()
	}

	override onCancel: TLEventHandlers['onCancel'] = () => {
		this.cancel()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.cancel()
	}

	override onInterrupt = () => {
		this.cancel()
	}

	private complete() {
		if (this.info.onInteractionEnd) {
			this.editor.setCurrentTool(this.info.onInteractionEnd, {})
		} else {
			this.parent.transition('idle')
		}
	}

	private cancel() {
		this.editor.bailToMark(this.markId)

		if (this.info.onInteractionEnd) {
			this.editor.setCurrentTool(this.info.onInteractionEnd, {})
		} else {
			this.parent.transition('idle')
		}
	}
}
