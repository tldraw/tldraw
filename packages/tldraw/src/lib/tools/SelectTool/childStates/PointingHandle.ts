import {
	StateNode,
	TLArrowShape,
	TLEventHandlers,
	TLNoteShape,
	TLPointerEventInfo,
	TLShape,
	TLShapeId,
} from '@tldraw/editor'

export class PointingHandle extends StateNode {
	static override id = 'pointing_handle'
	shape = {} as TLShape

	info = {} as TLPointerEventInfo & { target: 'handle' }

	previewNote: TLShapeId | null = null

	override onEnter = (info: TLPointerEventInfo & { target: 'handle' }) => {
		this.info = info
		this.shape = info.shape
		if (this.editor.isShapeOfType<TLArrowShape>(this.shape, 'arrow')) {
			const initialTerminal = this.shape.props[info.handle.id as 'start' | 'end']

			if (initialTerminal?.type === 'binding') {
				this.editor.setHintingShapes([initialTerminal.boundShapeId])
			}
		}

		if (this.editor.isShapeOfType<TLNoteShape>(this.shape, 'note')) {
			this.previewNote = this.editor
				.getShapeUtil<TLNoteShape>(this.shape)
				// todo: fix this
				// @ts-expect-error
				.onHandlePointerDown({ shape: this.shape, handleId: this.info.handle.id })
		}

		this.editor.updateInstanceState(
			{ cursor: { type: 'grabbing', rotation: 0 } },
			{ ephemeral: true }
		)
	}

	override onExit = () => {
		this.editor.setHintingShapes([])
		this.editor.updateInstanceState(
			{ cursor: { type: 'default', rotation: 0 } },
			{ ephemeral: true }
		)
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		if (this.editor.isShapeOfType<TLNoteShape>(this.shape, 'note')) {
			this.editor
				.getShapeUtil<TLNoteShape>(this.shape)
				// todo: fix this
				// @ts-expect-error
				.onHandlePointerUp({ shape: this.shape, handleId: this.info.handle.id })
		}
		this.parent.transition('idle', this.info)
	}

	override onPointerMove: TLEventHandlers['onPointerMove'] = () => {
		if (this.editor.inputs.isDragging) {
			this.cleanupPreviewNote()
			this.parent.transition('dragging_handle', this.info)
		}
	}

	override onCancel: TLEventHandlers['onCancel'] = () => {
		this.cleanupPreviewNote()
		this.cancel()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.cancel()
	}

	override onInterrupt = () => {
		this.cancel()
	}

	private cancel() {
		this.parent.transition('idle')
	}
	private cleanupPreviewNote() {
		if (this.previewNote) {
			this.editor.deleteShape(this.previewNote!)
			this.previewNote = null
		}
	}
}
