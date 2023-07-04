import { StateNode } from '@tldraw/editor'
import { Idle } from './toolStates/Idle'
import { Pointing } from './toolStates/Pointing'

export class ArrowShapeTool extends StateNode {
	static override id = 'arrow'
	static override initial = 'idle'
	static override children = () => [Idle, Pointing]

	overrideshapeType = 'arrow'
}
