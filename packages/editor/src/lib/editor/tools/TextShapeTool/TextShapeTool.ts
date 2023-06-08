import { TLStyleType } from '../../../schema/styles/TLBaseStyle'
import { StateNode } from '../StateNode'
import { Idle } from './children/Idle'
import { Pointing } from './children/Pointing'

export class TextShapeTool extends StateNode {
	static override id = 'text'
	static initial = 'idle'

	static children = () => [Idle, Pointing]

	styles = ['color', 'font', 'align', 'size'] as TLStyleType[]
	shapeType = 'text'
}
