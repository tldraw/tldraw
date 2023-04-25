import { StateNode } from '../../../StateNode'
import { Idle } from './children/Idle'
import { PointingCrop } from './children/PointingCrop'
import { TranslatingCrop } from './children/TranslatingCrop'

export class Crop extends StateNode {
	static override id = 'crop'

	static initial = 'idle'
	static children = () => [Idle, TranslatingCrop, PointingCrop]
}
