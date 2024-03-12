import { StateNode } from '@tldraw/editor'
import { LaseringSession } from '../../../sessions/LaseringSession'

export class Lasering extends StateNode {
	static override id = 'brushing'

	session?: LaseringSession

	override onEnter = () => {
		this.session = new LaseringSession(this.editor, {
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
