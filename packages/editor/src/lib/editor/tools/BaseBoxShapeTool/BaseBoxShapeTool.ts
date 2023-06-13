import { TLShapeUtilConstructor } from '../../shapes/ShapeUtil'
import { StateNode } from '../StateNode'
import { Idle } from './children/Idle'
import { Pointing } from './children/Pointing'

/** @public */
export abstract class BaseBoxShapeTool extends StateNode {
	static override id = 'box'
	static initial = 'idle'
	static children = () => [Idle, Pointing]

	abstract shapeType: TLShapeUtilConstructor<any>
}
