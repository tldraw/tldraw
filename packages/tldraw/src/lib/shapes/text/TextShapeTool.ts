import { StateNode, TLStateNodeConstructor } from '@tldraw/editor'
import { Idle } from './toolStates/Idle'
import { Pointing } from './toolStates/Pointing'

/** @public */
export class TextShapeTool extends StateNode {
	static override id = 'text'
	static override initial = 'idle'
	static override children = (): TLStateNodeConstructor[] => [Idle, Pointing]
	static override isLockable = false
	override shapeType = 'text'
}
