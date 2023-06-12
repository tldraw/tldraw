import { TLStyleType } from '@tldraw/tlschema'
import { StateNode } from '../../tools/StateNode'
import { Idle } from './toolStates/Idle'
import { Pointing } from './toolStates/Pointing'

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
