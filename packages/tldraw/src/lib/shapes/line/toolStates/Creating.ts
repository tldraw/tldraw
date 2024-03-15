import { StateNode, TLHandle, TLLineShape } from '@tldraw/editor'
import { DraggingHandleInteraction } from '../../../interactions/DraggingHandleInteraction'

export class Creating extends StateNode {
	static override id = 'creating'

	session?: DraggingHandleInteraction

	override onEnter = (info: { shape: TLLineShape; handle: TLHandle }) => {
		this.session = new DraggingHandleInteraction(this.editor, {
			isCreating: true,
			handle: info.handle,
			shape: info.shape,
			onCancel: () => {
				this.editor.bailToMark(`creating:${info.shape.id}`)
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
