import { StateNode } from '../StateNode'

import { Erasing } from './children/Erasing'
import { Idle } from './children/Idle'
import { Pointing } from './children/Pointing'

export class EraserTool extends StateNode {
	static override id = 'eraser'
	static initial = 'idle'
	static children = () => [Idle, Pointing, Erasing]

	onEnter = () => {
		this.editor.setCursor({ type: 'cross' })
	}
}
