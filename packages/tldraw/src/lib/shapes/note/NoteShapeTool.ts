import { StateNode } from '@tldraw/editor'
import { BrushingDropZone } from './toolStates/BrushingDropZone'
import { Idle } from './toolStates/Idle'
import { Pointing } from './toolStates/Pointing'
import { PointingDropZone } from './toolStates/PointingDropZone'

/** @public */
export class NoteShapeTool extends StateNode {
	static override id = 'note'
	static override initial = 'idle'
	static override children = () => [Idle, Pointing, PointingDropZone, BrushingDropZone]
	override shapeType = 'note'
}
