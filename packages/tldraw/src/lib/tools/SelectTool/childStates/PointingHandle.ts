import {
	StateNode,
	TLArrowShape,
	TLEventHandlers,
	TLNoteShape,
	TLPointerEventInfo,
} from '@tldraw/editor'

export class PointingHandle extends StateNode {
	static override id = 'pointing_handle'

	info = {} as TLPointerEventInfo & { target: 'handle' }

	override onEnter = (info: TLPointerEventInfo & { target: 'handle' }) => {
		this.info = info

		const { shape } = info
		if (this.editor.isShapeOfType<TLArrowShape>(shape, 'arrow')) {
			const initialTerminal = shape.props[info.handle.id as 'start' | 'end']

			if (initialTerminal?.type === 'binding') {
				this.editor.setHintingShapes([initialTerminal.boundShapeId])
			}
		}
		if (this.editor.isShapeOfType<TLNoteShape>(shape, 'note')) {
			this.editor
				.getShapeUtil<TLNoteShape>(shape)
				// todo: fix this
				// @ts-expect-error
				.onHandlePointerDown({ shape, handleId: this.info.handle.id })
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
