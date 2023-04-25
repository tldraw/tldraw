import { StateNode } from '../StateNode'

import { TLStyleType } from '@tldraw/tlschema'
import { Idle } from './children/Idle'
import { Pointing } from './children/Pointing'

export class TLGeoTool extends StateNode {
	static override id = 'geo'
	static initial = 'idle'
	static children = () => [Idle, Pointing]

	styles = ['color', 'opacity', 'dash', 'fill', 'size', 'geo', 'font', 'align'] as TLStyleType[]
}
