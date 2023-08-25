import { StateNode } from '@tldraw/editor'
import { Idle } from './children/Idle'
import { Lasering } from './children/Lasering'

/** @public */
export class LaserTool extends StateNode {
	static override id = 'laser'
	static override initial = 'idle'
	static override children = () => [Idle, Lasering]

	override onEnter = () => {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}
}
