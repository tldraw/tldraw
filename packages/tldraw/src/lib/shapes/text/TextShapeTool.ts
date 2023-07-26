import { StateNode } from '../../editor'
import { Idle } from './toolStates/Idle'
import { Pointing } from './toolStates/Pointing'

export class TextShapeTool extends StateNode {
	static override id = 'text'
	static override initial = 'idle'
	static override children = () => [Idle, Pointing]
	override shapeType = 'text'
}
