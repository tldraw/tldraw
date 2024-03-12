import { SelectionHandle, StateNode, TLGeoShape } from '@tldraw/editor'
import { ResizingSession } from '../../../sessions/ResizingSession'

export class CreatingGeo extends StateNode {
	static override id = 'creating_geo'

	session?: ResizingSession

	override onEnter = (info: { shape: TLGeoShape; handle: SelectionHandle }) => {
		this.session = new ResizingSession(this.editor, {
			isCreating: true,
			handle: info.handle,
			onCancel: () => {
				this.parent.transition('idle')
			},
			onComplete: () => {
				if (this.editor.getInstanceState().isToolLocked) {
					this.parent.transition('idle')
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
