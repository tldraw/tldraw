import { StateNode } from '@tldraw/editor'
import { Cropping } from './children/Cropping'
import { Idle } from './children/Idle'
import { PointingCrop } from './children/PointingCrop'
import { PointingCropHandle } from './children/PointingCropHandle'
import { TranslatingCrop } from './children/TranslatingCrop'

export class Crop extends StateNode {
	static override id = 'crop'
	static override initial = 'idle'
	static override children = () => [
		Idle,
		TranslatingCrop,
		PointingCrop,
		PointingCropHandle,
		Cropping,
	]

	markId = ''
	override onEnter = () => {
		this.didCancel = false
		this.markId = this.editor.history.mark()
	}
	didCancel = false
	override onExit = () => {
		if (this.didCancel) {
			this.editor.bailToMark(this.markId)
		} else {
			this.editor.history.squashToMark(this.markId)
		}
	}
	override onCancel = () => {
		this.didCancel = true
	}
}
