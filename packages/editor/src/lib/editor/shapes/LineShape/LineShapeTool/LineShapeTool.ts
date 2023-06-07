import { TLStyleType } from '@tldraw/tlschema'

import { StateNode } from '../../../tools/StateNode'
import { Idle } from './children/Idle'
import { Pointing } from './children/Pointing'

export class LineShapeTool extends StateNode {
	static override id = 'line'
	static initial = 'idle'
	static children = () => [Idle, Pointing]

	shapeType = 'line'

	styles = ['color', 'dash', 'size', 'spline'] as TLStyleType[]
}
