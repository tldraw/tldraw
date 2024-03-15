import { RotateCorner, StateNode, TLPointerEventInfo } from '@tldraw/editor'
import { RotatingInteraction } from '../../../interactions/RotatingInteraction'
import { CursorTypeMap } from '../select-helpers'

type PointingRotateHandleInfo = Extract<TLPointerEventInfo, { target: 'selection' }> & {
	handle: RotateCorner
}

export class PointingRotateHandle extends StateNode {
	static override id = 'pointing_rotate_handle'

	session?: RotatingInteraction

	override onEnter = (info: PointingRotateHandleInfo) => {
		const selectionRotation = this.editor.getSelectionRotation()
		this.editor.setCursor({
			type: CursorTypeMap[info.handle],
			rotation: selectionRotation,
		})

		this.session = new RotatingInteraction(this.editor, {
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
