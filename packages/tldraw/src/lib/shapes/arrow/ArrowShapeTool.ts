import { StateNode, TLStateNodeConstructor } from '@tldraw/editor'
import { Idle } from './toolStates/Idle'
import { Pointing } from './toolStates/Pointing'
import { SplinePointing } from './toolStates/SplinePointing'

/** @public */
export class ArrowShapeTool extends StateNode {
	static override id = 'arrow'
	static override initial = 'idle'
	static override children(): TLStateNodeConstructor[] {
		return [Idle, Pointing, SplinePointing]
	}

	override shapeType = 'arrow'
}
