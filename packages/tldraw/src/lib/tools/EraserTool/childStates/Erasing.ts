import { StateNode } from '@tldraw/editor'
import { ErasingInteraction } from '../../../interactions/ErasingInteraction'

export class Erasing extends StateNode {
	static override id = 'erasing'

	session?: ErasingInteraction

	override onEnter = () => {
		this.session = new ErasingInteraction(this.editor, {
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
