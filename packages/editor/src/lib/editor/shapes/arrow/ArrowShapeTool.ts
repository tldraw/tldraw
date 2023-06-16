import { StateNode } from '../../tools/StateNode'
import { ArrowShapeUtil } from './ArrowShapeUtil'
import { Idle } from './toolStates/Idle'
import { Pointing } from './toolStates/Pointing'

export class ArrowShapeTool extends StateNode {
	static override id = 'arrow'
	static initial = 'idle'
	static children = () => [Idle, Pointing]

	shapeType = ArrowShapeUtil
}
