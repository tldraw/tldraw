import { SelectionHandle, StateNode, TLShape } from '@tldraw/editor'
import { ResizingInteraction } from '../../../interactions/ResizingInteraction'
import { BaseBoxShapeTool } from '../BaseBoxShapeTool'

export class Creating extends StateNode {
	static override id = 'creating'

	session?: ResizingInteraction

	override onEnter = (info: { shape: TLShape; handle: SelectionHandle }) => {
		this.session = new ResizingInteraction(this.editor, {
			isCreating: true,
			handle: info.handle,
			onCancel: () => {
				this.parent.transition('idle')
			},
			onComplete: () => {
				const shape = this.editor.getShape(info.shape)
				if (shape) {
					;(this.parent as BaseBoxShapeTool).onCreate?.(shape)
				}

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
