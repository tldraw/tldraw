import { SelectionHandle, StateNode, TLGeoShape } from '@tldraw/editor'
import { ResizingSession } from '../../../sessions/ResizingSession'

export class CreatingText extends StateNode {
	static override id = 'creating_text'

	session?: ResizingSession

	override onEnter = (info: { shape: TLGeoShape; handle: SelectionHandle }) => {
		this.session = new ResizingSession(this.editor, {
			isCreating: true,
			handle: info.handle,
			onCancel: () => {
				this.parent.transition('idle')
			},
			onComplete: () => {
				const shape = this.editor.getShape(info.shape)
				if (shape) {
					this.editor.setEditingShape(shape.id)
					this.editor.setCurrentTool('select.editing_shape')
				} else {
					this.parent.transition('idle')
				}
			},
		}).start()
	}

	override onExit = () => {
		this.session?.dispose()
		delete this.session
	}
}
