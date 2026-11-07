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
			if (this.editor.getMarkIdMatching(this.markId) === this.markId) {
				this.editor.squashToMark(this.markId)
			}
		}
	}
	override onCancel() {
		// Parents handle events before children, so a cancel during a child's drag would unwind
		// the whole session here before the child bails to its own mark. Only idle's escape ends
		// the session; mid-drag children revert just their own change and return to idle.
		if (this.getCurrent()?.id !== 'idle') return
		if (!this.didExit) {
			this.didExit = true
			this.editor.bailToMark(this.markId)
		}
	}
}
