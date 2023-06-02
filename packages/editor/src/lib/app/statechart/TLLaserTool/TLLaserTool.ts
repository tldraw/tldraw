import { StateNode } from '../StateNode'

import { Idle } from './children/Idle'
import { Lasering } from './children/Lasering'

export class TLLaserTool extends StateNode {
	static override id = 'laser'

	static initial = 'idle'
	static children = () => [Idle, Lasering]

	onEnter = () => {
		this.editor.setCursor({ type: 'cross' })
	}
}
