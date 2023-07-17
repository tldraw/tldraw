import { StateNode } from '@tldraw/editor'
import { Idle } from './children/Idle'
import { PointingCrop } from './children/PointingCrop'
import { TranslatingCrop } from './children/TranslatingCrop'

export class Crop extends StateNode {
	static override id = 'crop'
	static override initial = 'idle'
	static override children = () => [Idle, TranslatingCrop, PointingCrop]
}
