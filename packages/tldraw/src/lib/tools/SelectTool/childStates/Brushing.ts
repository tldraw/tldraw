import { StateNode } from '@tldraw/editor'
import { BrushingSession } from '../../../sessions/BrushingSession'

export class Brushing extends StateNode {
	static override id = 'brushing'

	session?: BrushingSession

	override onEnter = () => {
		this.session = new BrushingSession(this.editor).start()
	}

	override onPointerUp = () => {
		this.session?.complete()
	}

	override onExit = () => {
		this.session?.dispose()
		delete this.session
	}
}
