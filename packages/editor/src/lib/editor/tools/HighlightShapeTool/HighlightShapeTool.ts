import { TLStyleType } from '@tldraw/tlschema'
import { StateNode } from '../StateNode'

// shared custody
import { Drawing } from '../DrawShapeTool/children/Drawing'
import { Idle } from '../DrawShapeTool/children/Idle'

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
