import { TLStyleType } from '@tldraw/tlschema'

// shared custody
import { StateNode } from '../../tools/StateNode'
import { Drawing } from '../draw/toolStates/Drawing'
import { Idle } from '../draw/toolStates/Idle'

export class HighlightShapeTool extends StateNode {
	static override id = 'highlight'
	static initial = 'idle'
	static children = () => [Idle, Drawing]

	styles = ['color', 'size'] as TLStyleType[]
	shapeType = 'highlight'

	onExit = () => {
		const drawingState = this.children!['drawing'] as Drawing
		drawingState.initialShape = undefined
	}
}
