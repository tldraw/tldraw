import { isAccelKey, StateNode, TLPointerEventInfo, type TLKeyboardEventInfo } from '@tldraw/editor'
import type { EraserTool } from '../EraserTool'

export class Idle extends StateNode {
	static override id = 'idle'

	override onEnter(info?: TLPointerEventInfo) {
		if (!(info?.accelKey ?? this.editor.inputs.getAccelKey())) {
			;(this.parent as EraserTool).maybeReturnToOriginatingTool()
		}
	}

	override onKeyUp(info: TLKeyboardEventInfo) {
		if (!isAccelKey(info)) {
			;(this.parent as EraserTool).maybeReturnToOriginatingTool()
		}
	}

	override onPointerDown(info: TLPointerEventInfo) {
		this.parent.transition('pointing', info)
	}

	override onCancel() {
		const onInteractionEnd = (this.parent as EraserTool).info.onInteractionEnd
		this.editor.setCurrentTool(onInteractionEnd ?? 'select')
	}
}
