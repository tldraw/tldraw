import { StateNode } from '@tldraw/editor'
import { Drawing } from './toolStates/Drawing'
import { DrawingSimple } from './toolStates/Drawing_Simple'
import { Idle } from './toolStates/Idle'

/** @public */
export class DrawShapeTool extends StateNode {
	static override id = 'draw'
	static override initial = 'idle'
	static override children = () => [Idle, Drawing, DrawingSimple]

	override shapeType = 'draw'

	override onExit = () => {
		const drawingState = this.children!['drawing'] as Drawing
		drawingState.initialShape = undefined
	}
}
