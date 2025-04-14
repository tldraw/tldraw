import { StateNode, TLStateNodeConstructor } from '@tldraw/editor'
import { Drawing } from './toolStates/Drawing'
import { Idle } from './toolStates/Idle'

/** @public */
export class DrawShapeTool extends StateNode {
	static override id = 'draw'
	static override initial = 'idle'
	static override isLockable = false
	static override children(): TLStateNodeConstructor[] {
		return [Idle, Drawing]
	}

	override shapeType = 'draw'

	override onExit() {
		const drawingState = this.children!['drawing'] as Drawing
		drawingState.initialShape = undefined
	}
}
