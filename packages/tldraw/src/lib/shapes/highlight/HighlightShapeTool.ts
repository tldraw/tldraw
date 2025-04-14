// shared custody
import { StateNode, TLStateNodeConstructor } from '@tldraw/editor'
import { Drawing } from '../draw/toolStates/Drawing'
import { Idle } from '../draw/toolStates/Idle'

/** @public */
export class HighlightShapeTool extends StateNode {
	static override id = 'highlight'
	static override initial = 'idle'
	static override children(): TLStateNodeConstructor[] {
		return [Idle, Drawing]
	}
	static override isLockable = false
	override shapeType = 'highlight'

	override onExit() {
		const drawingState = this.children!['drawing'] as Drawing
		drawingState.initialShape = undefined
	}
}
