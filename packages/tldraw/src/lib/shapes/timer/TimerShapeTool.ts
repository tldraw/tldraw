import { StateNode, TLStateNodeConstructor } from '@tldraw/editor'
import { Idle } from './toolStates/Idle'
import { Pointing } from './toolStates/Pointing'

/** @public */
export class TimerShapeTool extends StateNode {
	static override id = 'timer'
	static override initial = 'idle'
	static override children(): TLStateNodeConstructor[] {
		return [Idle, Pointing]
	}
	static override isLockable = true
	override shapeType = 'timer'
}
