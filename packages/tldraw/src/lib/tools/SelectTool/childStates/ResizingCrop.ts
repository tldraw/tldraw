import { SelectionHandle, StateNode, TLEnterEventHandler, TLImageShape } from '@tldraw/editor'
import { ResizingCropInteraction } from '../../../interactions/ResizingCropInteraction'

export class ResizingCrop extends StateNode {
	static override id = 'resizing_crop'

	session?: ResizingCropInteraction

	override onEnter: TLEnterEventHandler = (info: {
		handle: SelectionHandle
		shape: TLImageShape
	}) => {
		this.session = new ResizingCropInteraction(this.editor, {
			shape: info.shape,
			handle: info.handle,
			onStart: () => {
				this.editor.setCursor({ type: 'grabbing', rotation: 0 })
			},
			onEnd: () => {
				this.parent.transition('idle')
			},
		}).start()
	}

	override onExit = () => {
		this.session?.dispose()
		delete this.session
	}
}
