import { StateNode, TLNoteShape } from '@tldraw/editor'
import { TranslatingInteraction } from '../../../interactions/TranslatingInteraction'

export class Creating extends StateNode {
	static override id = 'creating_note'

	session?: TranslatingInteraction

	override onEnter = (info: { shape: TLNoteShape }) => {
		this.session = new TranslatingInteraction(this.editor, {
			isCreating: true,
			onCancel: () => {
				this.parent.transition('idle')
			},
			onComplete: () => {
				if (this.editor.getInstanceState().isToolLocked) {
					this.parent.transition('idle', { shapeId: info.shape.id })
				} else {
					this.editor.setEditingShape(info.shape.id)
					this.editor.setCurrentTool('select.editing_shape', {
						shape: info.shape,
					})
				}
			},
		}).start()
	}

	override onExit = () => {
		this.session?.dispose()
		delete this.session
	}
}
