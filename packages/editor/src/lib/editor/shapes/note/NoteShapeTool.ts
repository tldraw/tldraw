import { TLStyleType } from '@tldraw/tlschema'
import { StateNode } from '../../tools/StateNode'
import { Idle } from './toolStates/Idle'
import { Pointing } from './toolStates/Pointing'

export class NoteShapeTool extends StateNode {
	static override id = 'note'
	static initial = 'idle'
	static children = () => [Idle, Pointing]

	styles = ['color', 'size', 'align', 'verticalAlign', 'font'] as TLStyleType[]
	shapeType = 'note'
}
