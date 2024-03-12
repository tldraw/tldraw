import { StateNode, TLNoteShape } from '@tldraw/editor'
import { TranslatingSession } from '../../../sessions/TranslatingSession'

export class CreatingNote extends StateNode {
	static override id = 'creating_note'

	session?: TranslatingSession

	override onEnter = (info: { shape: TLNoteShape }) => {
		this.session = new TranslatingSession(this.editor, {
			isCreating: true,
			onCancel: () => {
				this.parent.transition('idle')
			},
			onComplete: () => {
				if (this.editor.getInstanceState().isToolLocked) {
					this.parent.transition('idle')
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
