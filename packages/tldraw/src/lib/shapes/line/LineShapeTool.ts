import { StateNode } from '../../editor'
import { Idle } from './toolStates/Idle'
import { Pointing } from './toolStates/Pointing'

export class LineShapeTool extends StateNode {
	static override id = 'line'
	static override initial = 'idle'
	static override children = () => [Idle, Pointing]

	override shapeType = 'line'
}
