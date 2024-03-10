import {
	StateNode,
	TLCancelEvent,
	TLEventHandlers,
	TLInterruptEvent,
	TLKeyboardEvent,
	TLShape,
	TLTickEventHandler,
} from '@tldraw/editor'
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

	override onTick: TLTickEventHandler = () => {
		this.session.update()
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.session.complete()
	}

	override onCancel?: TLCancelEvent | undefined = () => {
		this.session.cancel()
	}

	override onKeyDown: TLEventHandlers['onKeyDown'] = () => {
		this.session.update()
	}

	override onKeyUp?: TLKeyboardEvent | undefined = () => {
		this.session.update()
	}

	override onInterrupt: TLInterruptEvent = () => {
		this.session.interrupt()
	}
}
