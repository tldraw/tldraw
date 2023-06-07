import { StateNode } from '@tldraw/editor'
import { TLStyleType } from '@tldraw/tlschema'
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
