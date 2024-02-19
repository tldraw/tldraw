import { TLEventHandlers, TLLineShape, TLPointerEventInfo } from '@tldraw/editor'
import { PointingHandle } from './GenericPointingHandle'

export class PointingLineHandle extends PointingHandle {
	static override id = 'pointing_line_handle'

	override onEnter = (info: TLPointerEventInfo & { shape: TLLineShape; target: 'handle' }) => {
		this.info = info

		this.editor.updateInstanceState(
			{ cursor: { type: 'grabbing', rotation: 0 } },
			{ ephemeral: true }
		)
	}

	override onPointerMove: TLEventHandlers['onPointerMove'] = () => {
		if (this.editor.inputs.isDragging) {
			this.parent.transition('dragging_line_handle', this.info)
		}
	}
}
