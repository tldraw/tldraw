import { TLStyleType } from '@tldraw/tlschema'
import { Drawing } from '../../shapes/DrawShape/DrawShapeTool/children/Drawing'
import { Idle } from '../EraserTool/children/Idle'
import { StateNode } from '../StateNode'

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
