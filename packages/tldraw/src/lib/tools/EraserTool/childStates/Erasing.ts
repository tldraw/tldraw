import { StateNode } from '@tldraw/editor'
import { ErasingSession } from '../../../sessions/ErasingSession'

export class Erasing extends StateNode {
	static override id = 'erasing'

	session?: ErasingSession

	override onEnter = () => {
		this.session = new ErasingSession(this.editor, {
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
