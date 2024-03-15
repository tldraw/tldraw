import { StateNode } from '@tldraw/editor'
import { HandPanningInteraction } from '../../../interactions/HandPanningInteraction'

export class Dragging extends StateNode {
	static override id = 'dragging'

	session?: HandPanningInteraction

	override onEnter = () => {
		this.session = new HandPanningInteraction(this.editor, {
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
