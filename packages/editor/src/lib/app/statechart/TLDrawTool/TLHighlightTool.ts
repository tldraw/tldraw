import { TLStyleType } from '@tldraw/tlschema'
import { StateNode } from '../StateNode'

import { Drawing } from './children/Drawing'
import { Idle } from './children/Idle'

export class TLHighlightTool extends StateNode {
	static override id = 'highlight'
	static initial = 'idle'
	static children = () => [Idle, Drawing]

	styles = ['color', 'opacity', 'size'] as TLStyleType[]

	onExit = () => {
		const drawingState = this.children!['drawing'] as Drawing
		drawingState.initialShape = undefined
	}
}
