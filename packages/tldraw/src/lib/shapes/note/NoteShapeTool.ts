import { StateNode } from '@tldraw/editor'
import { CreatingNote } from './toolStates/CreatingNote'
import { Idle } from './toolStates/Idle'
import { Pointing } from './toolStates/Pointing'

/** @public */
export class NoteShapeTool extends StateNode {
	static override id = 'note'
	static override initial = 'idle'
	static override children = () => [Idle, Pointing, CreatingNote]
	override shapeType = 'note'
}
