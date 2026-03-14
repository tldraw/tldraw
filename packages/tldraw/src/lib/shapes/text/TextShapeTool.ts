import { StateNode, TLStateNodeConstructor } from '@tldraw/editor'
import { Idle } from './toolStates/Idle'
import { Pointing } from './toolStates/Pointing'
import { ResizingCreatedText } from './toolStates/ResizingCreatedText'

/** @public */
export class TextShapeTool extends StateNode {
	static override id = 'text'
	static override initial = 'idle'
	static override children(): TLStateNodeConstructor[] {
		return [Idle, Pointing, ResizingCreatedText]
	}
	override shapeType = 'text'
}
