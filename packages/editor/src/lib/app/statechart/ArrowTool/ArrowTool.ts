import { TLStyleType } from '@tldraw/tlschema'
import { StateNode } from '../StateNode'
import { Idle } from './children/Idle'
import { Pointing } from './children/Pointing'

export class ArrowTool extends StateNode {
	static override id = 'arrow'
	static initial = 'idle'
	static children = () => [Idle, Pointing]

	shapeType = 'arrow'

	styles = [
		'color',
		'opacity',
		'dash',
		'size',
		'arrowheadStart',
		'arrowheadEnd',
		'font',
		'fill',
	] as TLStyleType[]
}
