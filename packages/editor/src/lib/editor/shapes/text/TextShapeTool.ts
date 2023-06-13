import { StateNode } from '../../tools/StateNode'
import { TextShapeUtil } from './TextShapeUtil'
import { Idle } from './toolStates/Idle'
import { Pointing } from './toolStates/Pointing'

export class TextShapeTool extends StateNode {
	static override id = 'text'
	static initial = 'idle'

	static children = () => [Idle, Pointing]

	shapeType = TextShapeUtil
}
