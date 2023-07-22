import { StateNode } from '@tldraw/editor'
import { Erasing } from './children/Erasing'
import { Idle } from './children/Idle'
import { Pointing } from './children/Pointing'

export class EraserTool extends StateNode {
	static override id = 'eraser'
	static override initial = 'idle'
	static override children = () => [Idle, Pointing, Erasing]

	override onEnter = () => {
		this.editor.updateInstanceState({ cursor: { type: 'cross', rotation: 0 } }, true)
	}
}
