import { RotateCorner, StateNode } from '@tldraw/editor'
import { RotatingSession } from '../../../sessions/RotatingSession'

export class Rotating extends StateNode {
	static override id = 'rotating'

	session?: RotatingSession

	override onEnter = (info: { handle: RotateCorner }) => {
		this.session = new RotatingSession(this.editor, {
			handle: info.handle,
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
