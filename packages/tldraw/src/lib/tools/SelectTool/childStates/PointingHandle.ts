import {
	StateNode,
	TLArrowShape,
	TLEventHandlers,
	TLNoteShape,
	TLPointerEventInfo,
	TLShape,
} from '@tldraw/editor'

export class PointingHandle extends StateNode {
	static override id = 'pointing_handle'
	shape = {} as TLShape

	info = {} as TLPointerEventInfo & { target: 'handle' }

	override onEnter = (info: TLPointerEventInfo & { target: 'handle' }) => {
		this.info = info
		this.shape = info.shape
		if (this.editor.isShapeOfType<TLArrowShape>(this.shape, 'arrow')) {
			const initialTerminal = this.shape.props[info.handle.id as 'start' | 'end']

			if (initialTerminal?.type === 'binding') {
				this.editor.setHintingShapes([initialTerminal.boundShapeId])
			}
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
			console.log(this.info)
			this.editor
				.getShapeUtil<TLNoteShape>(this.shape)
				.onHandlePointerUp({ shape: this.shape, handleId: this.info.handle.id })
		}
		this.parent.transition('idle', this.info)
	}

	override onPointerMove: TLEventHandlers['onPointerMove'] = () => {
		if (this.editor.inputs.isDragging) {
			this.parent.transition('dragging_handle', this.info)
		}
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

	private cancel() {
		this.parent.transition('idle')
	}
}
