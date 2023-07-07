import { StateNode } from '../StateNode'

import { Idle } from './children/Idle'
import { Lasering } from './children/Lasering'

export class LaserTool extends StateNode {
	static override id = 'laser'
	static override initial = 'idle'
	static override children = () => [Idle, Lasering]

	override onEnter = () => {
		this.editor.setCursor({ type: 'cross' })
	}
}
