import { TLStyleType } from '@tldraw/tlschema'
import { StateNode } from '../../../tools/StateNode'
import { Drawing } from './children/Drawing'
import { Idle } from './children/Idle'

export class DrawShapeTool extends StateNode {
	static override id = 'draw'
	static initial = 'idle'
	static children = () => [Idle, Drawing]

	styles = ['color', 'dash', 'fill', 'size'] as TLStyleType[]
	shapeType = 'draw'

	onExit = () => {
		const drawingState = this.children!['drawing'] as Drawing
		drawingState.initialShape = undefined
	}
}
