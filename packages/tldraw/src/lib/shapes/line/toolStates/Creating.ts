import { StateNode, TLHandle, TLLineShape } from '@tldraw/editor'
import { TranslatingLineHandleInteraction } from '../../../interactions/TranslatingLineHandleInteraction'

export class Creating extends StateNode {
	static override id = 'creating'

	session?: TranslatingLineHandleInteraction

	override onEnter = (info: { shape: TLLineShape; handle: TLHandle }) => {
		this.session = new TranslatingLineHandleInteraction(this.editor, {
			isCreating: true,
			handle: info.handle,
			shape: info.shape,
			onCancel: () => {
				this.parent.transition('idle')
			},
			onComplete: () => {
				if (this.editor.getInstanceState().isToolLocked) {
					this.parent.transition('idle', { shapeId: info.shape.id })
				} else {
					this.editor.setCurrentTool('select.idle')
				}
			},
		}).start()
	}

	override onExit = () => {
		this.session?.dispose()
		delete this.session
	}
}
