import { StateNode } from '../../tools/StateNode'
import { Idle } from './toolStates/Idle'
import { Pointing } from './toolStates/Pointing'

export class GeoShapeTool extends StateNode {
	static override id = 'geo'
	static initial = 'idle'
	static children = () => [Idle, Pointing]

	shapeType = 'geo'
}
