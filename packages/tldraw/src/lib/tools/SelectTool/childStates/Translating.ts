import { StateNode } from '@tldraw/editor'
import { TranslatingSession } from '../../../sessions/TranslatingSession'

export class Translating extends StateNode {
	static override id = 'translating'

	session?: TranslatingSession

	override onEnter = () => {
		this.session = new TranslatingSession(this.editor, {
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
