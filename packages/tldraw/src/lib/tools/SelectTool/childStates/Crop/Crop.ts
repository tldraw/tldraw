import { StateNode, uniqueId } from '@tldraw/editor'
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
		this.didExit = false
		this.markId = 'crop: ' + uniqueId()
		this.editor.mark(this.markId)
	}
	didExit = false
	override onExit = () => {
		this.onComplete()
	}
	override onCancel = () => {
		if (!this.didExit) {
			this.didExit = true
			this.editor.bailToMark(this.markId)
		}
	}
	override onComplete = () => {
		if (!this.didExit) {
			this.didExit = true
			this.editor.squashToMark(this.markId)
		}
	}
}
