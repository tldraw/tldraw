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
		this.markId = this.editor.markHistoryStoppingPoint('crop')
	}

	override onExit() {
		// Bailing pops the mark, so there is nothing to squash after a cancel
		if (this.editor.getMarkIdMatching(this.markId) === this.markId) {
			this.editor.squashToMark(this.markId)
		}
	}

	override onCancel() {
		// Parents see events before children. A cancel during a child interaction belongs to that
		// child, which bails its own mark and stays in crop mode; only a cancel from idle ends the
		// session and reverts it.
		if (this.getCurrent()?.id !== 'idle') return
		this.editor.bailToMark(this.markId)
	}
}
