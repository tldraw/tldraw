import { TLStyleType } from '../../../schema/styles/TLBaseStyle'
import { StateNode } from '../StateNode'

import { Idle } from './children/Idle'
import { Pointing } from './children/Pointing'

export class GeoShapeTool extends StateNode {
	static override id = 'geo'
	static initial = 'idle'
	static children = () => [Idle, Pointing]

	styles = [
		'color',
		'dash',
		'fill',
		'size',
		'geo',
		'font',
		'align',
		'verticalAlign',
	] as TLStyleType[]
	shapeType = 'geo'
}
