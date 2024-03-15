import { StateNode } from '@tldraw/editor'
import { LaseringInteraction } from '../../../interactions/LaseringInteraction'

export class Lasering extends StateNode {
	static override id = 'brushing'

	session?: LaseringInteraction

	override onEnter = () => {
		this.session = new LaseringInteraction(this.editor, {
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
