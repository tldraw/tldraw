import { StateNode, TLArrowShape, TLPointerEventInfo } from '@tldraw/editor'
import { TranslatingArrowLabelSession } from '../../../sessions/TranslatingArrowLabelSession'

export class PointingArrowLabel extends StateNode {
	static override id = 'pointing_arrow_label'

	session?: TranslatingArrowLabelSession

	override onEnter = (
		info: TLPointerEventInfo & {
			shape: TLArrowShape
			onInteractionEnd?: string
		}
	) => {
		this.session = new TranslatingArrowLabelSession(this.editor, {
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
