import { StateNode, TLShape } from '@tldraw/editor'
import { Creating } from './toolStates/Creating'
import { Idle } from './toolStates/Idle'
import { Pointing } from './toolStates/Pointing'

/** @public */
export abstract class BaseBoxShapeTool extends StateNode {
	static override id = 'box'
	static override initial = 'idle'
	static override children = () => [Idle, Pointing, Creating]

	abstract override shapeType: string

	onCreate?: (_shape: TLShape | null) => void | null
}
