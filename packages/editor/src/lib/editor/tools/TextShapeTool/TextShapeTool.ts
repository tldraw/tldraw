import { TLStyleType } from '@tldraw/tlschema'
import { StateNode } from '../StateNode'
import { Idle } from './toolStates/Idle'
import { Pointing } from './toolStates/Pointing'

export class TextShapeTool extends StateNode {
	static override id = 'text'
	static initial = 'idle'

	static children = () => [Idle, Pointing]

	styles = ['color', 'font', 'align', 'size'] as TLStyleType[]
	shapeType = 'text'
}
