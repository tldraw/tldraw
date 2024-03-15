import { StateNode, TLHandle, TLLineShape, TLPointerEventInfo } from '@tldraw/editor'
import { TranslatingLineHandleInteraction } from '../../../interactions/TranslatingLineHandleInteraction'

export class PointingLineHandle extends StateNode {
	static override id = 'pointing_line_handle'

	session?: TranslatingLineHandleInteraction

	override onEnter = (
		info: TLPointerEventInfo & {
			shape: TLLineShape
			handle: TLHandle
			onInteractionEnd?: string
		}
	) => {
		this.session = new TranslatingLineHandleInteraction(this.editor, {
			isCreating: false,
			shape: info.shape,
			handle: info.handle,
			onStart: () => {
				this.editor.setCursor({ type: 'grabbing', rotation: 0 })
			},
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
