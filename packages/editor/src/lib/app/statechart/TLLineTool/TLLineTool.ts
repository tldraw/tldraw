import { TLShapeType, TLStyleType } from '@tldraw/tlschema'
import { StateNode } from '../StateNode'

import { Idle } from './children/Idle'
import { Pointing } from './children/Pointing'

export class TLLineTool extends StateNode {
	static override id = 'line'
	static initial = 'idle'
	static children = () => [Idle, Pointing]

	shapeType: TLShapeType = 'line'

	styles = ['color', 'opacity', 'dash', 'size', 'spline'] as TLStyleType[]
}
