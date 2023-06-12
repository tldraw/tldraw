import { TLStyleType } from '@tldraw/tlschema'
import { StateNode } from '../StateNode'

import { Idle } from './toolStates/Idle'
import { Pointing } from './toolStates/Pointing'

export class LineShapeTool extends StateNode {
	static override id = 'line'
	static initial = 'idle'
	static children = () => [Idle, Pointing]

	shapeType = 'line'

	styles = ['color', 'dash', 'size', 'spline'] as TLStyleType[]
}
