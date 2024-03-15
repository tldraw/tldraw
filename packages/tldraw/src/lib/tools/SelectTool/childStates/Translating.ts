import { StateNode } from '@tldraw/editor'
import { TranslatingInteraction } from '../../../interactions/TranslatingInteraction'

export class Translating extends StateNode {
	static override id = 'translating'

	session?: TranslatingInteraction

	override onEnter = () => {
		this.session = new TranslatingInteraction(this.editor, {
			isCreating: false,
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
