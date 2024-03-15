import { StateNode, TLArrowShape, TLPointerEventInfo } from '@tldraw/editor'
import { TranslatingArrowLabelInteraction } from '../../../interactions/TranslatingArrowLabelInteraction'

export class PointingArrowLabel extends StateNode {
	static override id = 'pointing_arrow_label'

	session?: TranslatingArrowLabelInteraction

	override onEnter = (
		info: TLPointerEventInfo & {
			shape: TLArrowShape
			onInteractionEnd?: string
		}
	) => {
		this.session = new TranslatingArrowLabelInteraction(this.editor, {
			shape: info.shape,
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
