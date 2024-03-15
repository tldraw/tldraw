import { StateNode } from '@tldraw/editor'
import { Creating } from './toolStates/Creating'
import { Idle } from './toolStates/Idle'
import { Pointing } from './toolStates/Pointing'

/** @public */
export class GeoShapeTool extends StateNode {
	static override id = 'geo'
	static override initial = 'idle'
	static override children = () => [Idle, Pointing, Creating]
	override shapeType = 'geo'
}
