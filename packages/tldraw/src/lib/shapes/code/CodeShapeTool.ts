import { StateNode } from '@tldraw/editor'
import { Idle } from './toolStates/Idle'
import { Pointing } from './toolStates/Pointing'

/** @public */
export class CodeShapeTool extends StateNode {
	static override id = 'code'
	static override initial = 'idle'
	static override children = () => [Idle, Pointing]
	override shapeType = 'code'
}
