import { StateNode, TLStateNodeConstructor } from '@tldraw/editor'
import { CreationTranslating } from '../../tools/creation-states/CreationTranslating'
import { Idle } from './toolStates/Idle'
import { Pointing } from './toolStates/Pointing'

/** @public */
export class NoteShapeTool extends StateNode {
	static override id = 'note'
	static override initial = 'idle'
	static override children(): TLStateNodeConstructor[] {
		return [Idle, Pointing, CreationTranslating]
	}
	override shapeType = 'note'
}
