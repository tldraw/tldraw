import { SelectionHandle, StateNode, TLShape } from '@tldraw/editor'
import { ResizingSession } from '../../../sessions/ResizingSession'
import { BaseBoxShapeTool } from '../BaseBoxShapeTool'

export class Creating extends StateNode {
	static override id = 'creating'

	session?: ResizingSession

	override onEnter = (info: { shape: TLShape; handle: SelectionHandle }) => {
		this.session = new ResizingSession(this.editor, {
			isCreating: true,
			handle: info.handle,
			onCancel: () => {
				this.parent.transition('idle')
			},
			onComplete: () => {
				if (this.editor.getInstanceState().isToolLocked) {
					this.parent.transition('idle')
					const shape = this.editor.getShape(info.shape)
					if (shape) {
						;(this.parent as BaseBoxShapeTool).onCreate?.(shape)
					}
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
