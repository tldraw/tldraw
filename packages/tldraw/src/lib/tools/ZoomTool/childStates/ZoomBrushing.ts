import { StateNode } from '@tldraw/editor'
import { ZoomBrushingInteraction } from '../../../interactions/ZoomBrushingInteraction'

export class ZoomBrushing extends StateNode {
	static override id = 'zoom_brushing'

	session?: ZoomBrushingInteraction

	override onEnter = () => {
		this.session = new ZoomBrushingInteraction(this.editor, {
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
