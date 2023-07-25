import { StateNode } from '@tldraw/editor'
import { Idle } from './children/Idle'
import { Lasering } from './children/Lasering'

export class LaserTool extends StateNode {
	static override id = 'laser'
	static override initial = 'idle'
	static override children = () => [Idle, Lasering]

	override onEnter = () => {
		this.editor.updateInstanceState({ cursor: { type: 'cross', rotation: 0 } }, true)
	}
}
