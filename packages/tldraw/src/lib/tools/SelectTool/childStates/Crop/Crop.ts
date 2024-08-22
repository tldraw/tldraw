import { StateNode, TLStateNodeConstructor } from '@tldraw/editor'
import { Cropping } from './children/Cropping'
import { Idle } from './children/Idle'
import { PointingCrop } from './children/PointingCrop'
import { PointingCropHandle } from './children/PointingCropHandle'
import { TranslatingCrop } from './children/TranslatingCrop'

export class Crop extends StateNode {
	static override id = 'crop'
	static override initial = 'idle'
	static override children(): TLStateNodeConstructor[] {
		return [Idle, TranslatingCrop, PointingCrop, PointingCropHandle, Cropping]
	}

	markId = ''

	override onEnter() {
		this.didExit = false
		this.markId = this.editor.markHistoryStoppingPoint('crop')
	}
	didExit = false
	override onExit() {
		if (!this.didExit) {
			this.didExit = true
			this.editor.squashToMark(this.markId)
		}
	}
	override onCancel() {
		if (!this.didExit) {
			this.didExit = true
			this.editor.bailToMark(this.markId)
		}
	}
}
