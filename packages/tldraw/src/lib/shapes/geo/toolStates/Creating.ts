import { SelectionHandle, StateNode, TLGeoShape } from '@tldraw/editor'
import { ResizingInteraction } from '../../../interactions/ResizingInteraction'

export class Creating extends StateNode {
	static override id = 'creating'

	session?: ResizingInteraction

	override onEnter = (info: { shape: TLGeoShape; handle: SelectionHandle }) => {
		this.session = new ResizingInteraction(this.editor, {
			isCreating: true,
			handle: info.handle,
			onCancel: () => {
				this.parent.transition('idle')
			},
			onComplete: () => {
				if (this.editor.getInstanceState().isToolLocked) {
					this.parent.transition('idle', { shape: info.shape })
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
