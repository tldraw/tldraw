import { StateNode } from '@tldraw/editor'
import { BrushingSession } from '../../../sessions/BrushingSession'

export class Brushing extends StateNode {
	static override id = 'brushing'

	session?: BrushingSession

	override onEnter = () => {
		this.session = new BrushingSession(this.editor).start()
	}

	override onExit = () => {
		delete this.session
	}

	override onPointerUp = () => {
		this.session?.complete()
	}
}
