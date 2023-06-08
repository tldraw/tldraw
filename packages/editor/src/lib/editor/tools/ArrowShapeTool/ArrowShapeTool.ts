import { TLStyleType } from '../../../schema/styles/TLBaseStyle'
import { StateNode } from '../StateNode'
import { Idle } from './children/Idle'
import { Pointing } from './children/Pointing'

export class ArrowShapeTool extends StateNode {
	static override id = 'arrow'
	static initial = 'idle'
	static children = () => [Idle, Pointing]

	shapeType = 'arrow'

	styles = [
		'color',
		'dash',
		'size',
		'arrowheadStart',
		'arrowheadEnd',
		'font',
		'fill',
	] as TLStyleType[]
}
