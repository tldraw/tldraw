import { StateNode, TLImageShape } from '@tldraw/editor'
import { NudgingCropInteraction } from '../../../../../interactions/NudgingCropInteraction'

export class NudgingCrop extends StateNode {
	static override id = 'nudging_crop'

	session?: NudgingCropInteraction

	override onEnter = () => {
		this.session = new NudgingCropInteraction(this.editor, {
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
