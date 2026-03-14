import { StateNode, TLStateNodeConstructor } from '@tldraw/editor'
import { Idle } from './toolStates/Idle'
import { Pointing } from './toolStates/Pointing'
import { TranslatingCreatedNote } from './toolStates/TranslatingCreatedNote'

/** @public */
export class NoteShapeTool extends StateNode {
	static override id = 'note'
	static override initial = 'idle'
	static override children(): TLStateNodeConstructor[] {
		return [Idle, Pointing, TranslatingCreatedNote]
	}
	override shapeType = 'note'
}
