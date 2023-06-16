import { StateNode } from '../../tools/StateNode'
import { DrawShapeUtil } from './DrawShapeUtil'
import { Drawing } from './toolStates/Drawing'
import { Idle } from './toolStates/Idle'

export class DrawShapeTool extends StateNode {
	static override id = 'draw'
	static initial = 'idle'
	static children = () => [Idle, Drawing]

	shapeType = DrawShapeUtil

	onExit = () => {
		const drawingState = this.children!['drawing'] as Drawing
		drawingState.initialShape = undefined
	}
}
