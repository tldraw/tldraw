import { StateNode } from '../../tools/StateNode'
import { NoteShapeUtil } from './NoteShapeUtil'
import { Idle } from './toolStates/Idle'
import { Pointing } from './toolStates/Pointing'

export class NoteShapeTool extends StateNode {
	static override id = 'note'
	static initial = 'idle'
	static children = () => [Idle, Pointing]

	shapeType = NoteShapeUtil
}
