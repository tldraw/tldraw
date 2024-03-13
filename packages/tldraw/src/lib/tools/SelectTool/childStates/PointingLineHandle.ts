import { StateNode, TLHandle, TLLineShape, TLPointerEventInfo } from '@tldraw/editor'
import { TranslatingLineHandleSession } from '../../../sessions/TranslatingLineHandleSession'

export class PointingLineHandle extends StateNode {
	static override id = 'pointing_line_handle'

	session?: TranslatingLineHandleSession

	override onEnter = (
		info: TLPointerEventInfo & {
			shape: TLLineShape
			handle: TLHandle
			onInteractionEnd?: string
		}
	) => {
		this.session = new TranslatingLineHandleSession(this.editor, {
			isCreating: false,
			shape: info.shape,
			handle: info.handle,
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
