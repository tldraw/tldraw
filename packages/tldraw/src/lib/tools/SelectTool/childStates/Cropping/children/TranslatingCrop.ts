import { StateNode } from '@tldraw/editor'
import { TranslatingCropInteraction } from '../../../../../interactions/TranslatingCropInteraction'

export class TranslatingCrop extends StateNode {
	static override id = 'translating_crop'

	session?: TranslatingCropInteraction

	override onEnter = () => {
		this.session = new TranslatingCropInteraction(this.editor, {
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
