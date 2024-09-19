import { StateNode, TLStateNodeConstructor } from '@tldraw/editor'
import { Erasing } from './childStates/Erasing'
import { Idle } from './childStates/Idle'
import { Pointing } from './childStates/Pointing'

/** @public */
export class EraserTool extends StateNode {
	static override id = 'eraser'
	static override initial = 'idle'
	static override isLockable = false
	static override children(): TLStateNodeConstructor[] {
		return [Idle, Pointing, Erasing]
	}

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}
}
