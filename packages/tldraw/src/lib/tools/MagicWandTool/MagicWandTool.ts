import { StateNode, TLStateNodeConstructor } from '@tldraw/editor'
import { Drawing } from '../../shapes/draw/toolStates/Drawing'
import { Idle } from '../../shapes/draw/toolStates/Idle'
import { MagicWandDrawing } from './MagicWandDrawing'

/**
 * The magic wand tool. It draws like the draw tool, but recognizes gestures: a
 * stroke that circles existing shapes lasso-selects them instead of leaving a
 * drawing behind. It is intended to grow into a "multitool" that matches more
 * gestures to dispatch to different tools.
 *
 * @public
 */
export class MagicWandTool extends StateNode {
	static override id = 'magic-wand'
	static override initial = 'idle'
	static override isLockable = false
	static override useCoalescedEvents = true
	static override children(): TLStateNodeConstructor[] {
		return [Idle, MagicWandDrawing]
	}

	override shapeType = 'draw'

	override onExit() {
		const drawingState = this.children!['drawing'] as Drawing
		drawingState.initialShape = undefined
	}
}
