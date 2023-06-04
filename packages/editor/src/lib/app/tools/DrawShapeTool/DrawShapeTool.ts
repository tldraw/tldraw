import { TLStyleType } from '@tldraw/tlschema'
import { StateNode } from '../StateNode'

import { Drawing } from './children/Drawing'
import { Idle } from './children/Idle'

export class DrawShapeTool extends StateNode {
	static override id = 'draw'
	static initial = 'idle'
	static children = () => [Idle, Drawing]

	styles = ['color', 'opacity', 'dash', 'fill', 'size'] as TLStyleType[]

	onExit = () => {
		const drawingState = this.children!['drawing'] as Drawing
		drawingState.initialShape = undefined
	}
}
