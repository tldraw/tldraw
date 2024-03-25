import { StateNode } from '@tldraw/editor'
import { Brushing } from './toolStates/Brushing'
import { Dragging } from './toolStates/Dragging'
import { Idle } from './toolStates/Idle'
import { Pointing } from './toolStates/Pointing'
import { PointingDropZone } from './toolStates/PointingDropZone'

/** @public */
export class NoteShapeTool extends StateNode {
	static override id = 'note'
	static override initial = 'idle'
	static override children = () => [Idle, Pointing, PointingDropZone, Brushing, Dragging]
	override shapeType = 'note'
}
