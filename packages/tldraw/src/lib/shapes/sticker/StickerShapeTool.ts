import { StateNode } from '@tldraw/editor'
import { Idle } from './toolStates/Idle'
import { Pointing } from './toolStates/Pointing'

/** @public */
export class StickerShapeTool extends StateNode {
	static override id = 'sticker'
	static override initial = 'idle'
	static override children = () => [Idle, Pointing]
	override shapeType = 'sticker'
}
