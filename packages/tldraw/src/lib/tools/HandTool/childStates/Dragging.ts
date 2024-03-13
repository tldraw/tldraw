import { StateNode } from '@tldraw/editor'
import { HandPanningSession } from '../../../sessions/HandPanningSession'

export class Dragging extends StateNode {
	static override id = 'dragging'

	session?: HandPanningSession

	override onEnter = () => {
		this.session = new HandPanningSession(this.editor, {
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
