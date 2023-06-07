import { TLStyleType } from '@tldraw/tlschema'
import { StateNode } from '../../../tools/StateNode'
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
