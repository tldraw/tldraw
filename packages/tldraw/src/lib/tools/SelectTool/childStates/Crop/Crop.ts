import { StateNode } from '@tldraw/editor'
import { Cropping } from '../Cropping'
import { PointingCropHandle } from '../PointingCropHandle'
import { Idle } from './children/Idle'
import { NudgingCrop } from './children/NudgingCrop'
import { PointingCrop } from './children/PointingCrop'
import { TranslatingCrop } from './children/TranslatingCrop'

export class Crop extends StateNode {
	static override id = 'crop'
	static override initial = 'idle'
	static override children = () => [
		Idle,
		TranslatingCrop,
		PointingCrop,
		Cropping,
		PointingCropHandle,
		NudgingCrop,
	]
}
