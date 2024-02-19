import { TLArrowShape, TLEventHandlers, TLPointerEventInfo } from '@tldraw/editor'
import { PointingHandle } from './GenericPointingHandle'

export class PointingArrowHandle extends PointingHandle {
	static override id = 'pointing_arrow_handle'

	override onEnter = (info: TLPointerEventInfo & { shape: TLArrowShape; target: 'handle' }) => {
		this.info = info

		const initialTerminal = info.shape.props[info.handle.id as 'start' | 'end']

		if (initialTerminal?.type === 'binding') {
			this.editor.setHintingShapes([initialTerminal.boundShapeId])
		}

		this.editor.updateInstanceState(
			{ cursor: { type: 'grabbing', rotation: 0 } },
			{ ephemeral: true }
		)
	}

	override onPointerMove: TLEventHandlers['onPointerMove'] = () => {
		if (this.editor.inputs.isDragging) {
			this.parent.transition('dragging_arrow_handle', this.info)
		}
	}
}
