import { StateNode } from '../../tools/StateNode'
import { Idle } from './toolStates/Idle'
import { Pointing } from './toolStates/Pointing'

export class LineShapeTool extends StateNode {
	static override id = 'line'
	static initial = 'idle'
	static children = () => [Idle, Pointing]

	shapeType = 'line'
}
