import { StateNode, TLShape } from '@tldraw/editor'
import { BrushingSession } from '../../../sessions/BrushingSession'

export class Brushing extends StateNode {
	static override id = 'brushing'

	session = {} as BrushingSession

	// The shape that the brush started on
	initialStartShape: TLShape | null = null

	override onEnter = () => {
		this.session = new BrushingSession(this.editor)
		this.session.start()
		this.session.update()
	}

	override onTick = () => {
		this.session.update()
	}

	override onPointerUp = () => {
		this.session.complete()
		this.session.remove()
	}

	override onCancel = () => {
		this.session.cancel()
		this.session.remove()
	}

	override onInterrupt = () => {
		this.session.interrupt()
	}
}
