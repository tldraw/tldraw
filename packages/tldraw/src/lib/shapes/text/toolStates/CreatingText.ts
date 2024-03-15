import { SelectionHandle, StateNode, TLGeoShape } from '@tldraw/editor'
import { ResizingInteraction } from '../../../interactions/ResizingInteraction'

export class CreatingText extends StateNode {
	static override id = 'creating_text'

	session?: ResizingInteraction

	override onEnter = (info: { shape: TLGeoShape; handle: SelectionHandle }) => {
		this.session = new ResizingInteraction(this.editor, {
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
