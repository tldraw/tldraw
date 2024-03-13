import { StateNode } from '@tldraw/editor'
import { ZoomBrushingSession } from '../../../sessions/ZoomBrushingSession'

export class ZoomBrushing extends StateNode {
	static override id = 'zoom_brushing'

	session?: ZoomBrushingSession

	override onEnter = () => {
		this.session = new ZoomBrushingSession(this.editor, {
			onEnd: () => {
				this.parent.transition('idle')
			},
		}).start()
	}

	override onExit = () => {
		this.session?.dispose()
		delete this.session
	}
}
