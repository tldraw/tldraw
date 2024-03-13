import { RotateCorner, StateNode, TLPointerEventInfo } from '@tldraw/editor'
import { RotatingSession } from '../../../sessions/RotatingSession'
import { CursorTypeMap } from '../select-helpers'

type PointingRotateHandleInfo = Extract<TLPointerEventInfo, { target: 'selection' }> & {
	handle: RotateCorner
}

export class PointingRotateHandle extends StateNode {
	static override id = 'pointing_rotate_handle'

	session?: RotatingSession

	override onEnter = (info: PointingRotateHandleInfo) => {
		const selectionRotation = this.editor.getSelectionRotation()
		this.editor.setCursor({
			type: CursorTypeMap[info.handle],
			rotation: selectionRotation,
		})

		this.session = new RotatingSession(this.editor, {
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
