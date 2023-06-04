import { TLStyleType } from '@tldraw/tlschema'
import { StateNode } from '../StateNode'

// shared custody
import { Drawing } from '../DrawTool/children/Drawing'
import { Idle } from '../DrawTool/children/Idle'

export class HighlightTool extends StateNode {
	static override id = 'highlight'
	static initial = 'idle'
	static children = () => [Idle, Drawing]

	styles = ['color', 'opacity', 'size'] as TLStyleType[]

	onExit = () => {
		const drawingState = this.children!['drawing'] as Drawing
		drawingState.initialShape = undefined
	}
}
