import { SelectionHandle, StateNode, TLEnterEventHandler, TLImageShape } from '@tldraw/editor'
import { ResizingCropSession } from '../../../sessions/ResizingCropSession'

export class ResizingCrop extends StateNode {
	static override id = 'resizing_crop'

	session?: ResizingCropSession

	override onEnter: TLEnterEventHandler = (info: {
		handle: SelectionHandle
		shape: TLImageShape
	}) => {
		this.session = new ResizingCropSession(this.editor, {
			shape: info.shape,
			handle: info.handle,
			onExit: () => {
				this.parent.transition('idle')
			},
		}).start()
	}

	override onExit = () => {
		this.session?.dispose()
		delete this.session
	}
}
