import { StateNode } from '@tldraw/editor'
import { TranslatingCropSession } from '../../../../../sessions/TranslatingCropSession'

export class TranslatingCrop extends StateNode {
	static override id = 'translating_crop'

	session?: TranslatingCropSession

	override onEnter = () => {
		this.session = new TranslatingCropSession(this.editor, {
			onExit: () => {
				this.parent.transition('idle')
			},
		}).start()
	}

	override onPointerUp = () => {
		this.session?.complete()
		delete this.session
	}
}
