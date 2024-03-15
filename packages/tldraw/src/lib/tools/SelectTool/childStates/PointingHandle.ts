import { StateNode, TLArrowShape, TLEnterEventHandler, TLHandle } from '@tldraw/editor'
import { DraggingHandleInteraction } from '../../../interactions/DraggingHandleInteraction'

export class PointingHandle extends StateNode {
	static override id = 'pointing_handle'

	session?: DraggingHandleInteraction

	override onEnter: TLEnterEventHandler = (info: { handle: TLHandle; shape: TLArrowShape }) => {
		this.session = new DraggingHandleInteraction(this.editor, {
			isCreating: false,
			shape: info.shape,
			handle: info.handle,
			onStart: () => {
				this.editor.setCursor({ type: 'grabbing', rotation: 0 })
				this.editor.mark('dragging_handle')
			},
			onEnd: () => {
				this.parent.transition('idle')
			},
			onCancel: () => {
				this.editor.bailToMark('dragging_handle')
			},
		}).start()
	}

	override onExit = () => {
		this.session?.dispose()
		delete this.session
	}
}
