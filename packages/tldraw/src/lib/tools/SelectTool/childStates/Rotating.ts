import { RotateCorner, StateNode } from '@tldraw/editor'
import { RotatingInteraction } from '../../../interactions/RotatingInteraction'

export class Rotating extends StateNode {
	static override id = 'rotating'

	session?: RotatingInteraction

	override onEnter = (info: { handle: RotateCorner }) => {
		this.session = new RotatingInteraction(this.editor, {
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
