import { StateNode } from '../../tools/StateNode'
// shared custody
import { Drawing } from '../draw/toolStates/Drawing'
import { Idle } from '../draw/toolStates/Idle'
import { HighlightShapeUtil } from './HighlightShapeUtil'

export class HighlightShapeTool extends StateNode {
	static override id = 'highlight'
	static initial = 'idle'
	static children = () => [Idle, Drawing]

	shapeType = HighlightShapeUtil

	onExit = () => {
		const drawingState = this.children!['drawing'] as Drawing
		drawingState.initialShape = undefined
	}
}
