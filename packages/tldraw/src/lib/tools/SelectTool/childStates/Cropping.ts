import { SelectionHandle, StateNode, TLEnterEventHandler, TLImageShape } from '@tldraw/editor'
import { CroppingSession } from '../../../sessions/CroppingSession'

export class Cropping extends StateNode {
	static override id = 'cropping'

	session?: CroppingSession

	override onEnter: TLEnterEventHandler = (info: {
		handle: SelectionHandle
		shape: TLImageShape
	}) => {
		this.session = new CroppingSession(this.editor, {
			shape: info.shape,
			handle: info.handle,
			onExit: () => {
				this.parent.transition('idle')
			},
		}).start()
	}

	override onExit = () => {
		delete this.session
	}
}
