import { StateNode, TLArrowShape, TLHandle } from '@tldraw/editor'
import { TranslatingArrowTerminalInteraction } from '../../../interactions/TranslatingArrowTerminalInteraction'

export class Creating extends StateNode {
	static override id = 'creating'

	session?: TranslatingArrowTerminalInteraction

	override onEnter = (info: { shape: TLArrowShape; handle: TLHandle }) => {
		this.session = new TranslatingArrowTerminalInteraction(this.editor, {
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
