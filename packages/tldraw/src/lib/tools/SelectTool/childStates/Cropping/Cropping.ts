import { StateNode } from '@tldraw/editor'
import { Idle } from './children/Idle'
import { NudgingCrop } from './children/NudgingCrop'
import { PointingCrop } from './children/PointingCrop'
import { PointingCropHandle } from './children/PointingCropHandle'
import { TranslatingCrop } from './children/TranslatingCrop'
// Borrow these from select tool
import { PointingRotateHandle } from '../PointingRotateHandle'
import { ResizingCrop } from '../ResizingCrop'
import { Rotating } from '../Rotating'

export class Cropping extends StateNode {
	static override id = 'cropping'
	static override initial = 'idle'
	static override children = () => [
		Idle,
		TranslatingCrop,
		PointingCrop,
		ResizingCrop,
		PointingCropHandle,
		NudgingCrop,
		Rotating,
		PointingRotateHandle,
	]
}
