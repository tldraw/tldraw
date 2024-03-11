import { StateNode, TLImageShape } from '@tldraw/editor'
import { NudgingCropSession } from '../../../../../sessions/NudgingCropSession'

export class NudgingCrop extends StateNode {
	static override id = 'nudging_crop'

	session?: NudgingCropSession

	override onEnter = () => {
		this.session = new NudgingCropSession(this.editor, {
			shape: this.editor.getOnlySelectedShape()! as TLImageShape,
			onEnd: () => {
				this.parent.transition('idle')
			},
		}).start()
	}

	override onExit = () => {
		this.session?.dispose()
		delete this.session
	}
}
