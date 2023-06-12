import { StateNode } from '../StateNode'

import { TLStyleType } from '@tldraw/tlschema'
import { Idle } from './toolStates/Idle'
import { Pointing } from './toolStates/Pointing'

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
