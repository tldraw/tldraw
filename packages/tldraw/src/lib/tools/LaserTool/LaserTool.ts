import { StateNode, TLStateNodeConstructor } from '@tldraw/editor'
import { Idle } from './childStates/Idle'
import { Lasering } from './childStates/Lasering'

/** @public */
export class LaserTool extends StateNode {
	static override id = 'laser'
	static override initial = 'idle'
	static override children(): TLStateNodeConstructor[] {
		return [Idle, Lasering]
	}
	static override isLockable = false

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}
}
