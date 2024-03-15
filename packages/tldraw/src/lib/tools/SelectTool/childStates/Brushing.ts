import { StateNode } from '@tldraw/editor'
import { BrushingInteraction } from '../../../interactions/BrushingInteraction'

export class Brushing extends StateNode {
	static override id = 'brushing'

	session?: BrushingInteraction

	override onEnter = () => {
		this.session = new BrushingInteraction(this.editor, {
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
