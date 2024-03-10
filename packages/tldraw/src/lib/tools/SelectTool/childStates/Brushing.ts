import { StateNode } from '@tldraw/editor'
import { BrushingSession } from '../../../sessions/BrushingSession'

export class Brushing extends StateNode {
	static override id = 'brushing'

	session = {} as BrushingSession

	override onEnter = () => {
		this.session = new BrushingSession(this.editor)
		this.session.start()
		this.session.update()
	}

	override onPointerUp = () => {
		this.session.complete()
		this.session.dispose()
	}
}
