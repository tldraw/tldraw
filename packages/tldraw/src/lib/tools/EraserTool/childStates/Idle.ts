import { StateNode, TLPointerEventInfo } from '@tldraw/editor'
import type { EraserTool } from '../EraserTool'

export class Idle extends StateNode {
	static override id = 'idle'

	override onEnter() {
		// After a transient (accel-hold) erase finishes and we re-enter idle,
		// return to the originating tool if accel has already been released.
		;(this.parent as EraserTool).maybeReturnToOriginatingTool()
	}

	override onPointerDown(info: TLPointerEventInfo) {
		this.parent.transition('pointing', info)
	}

	override onCancel() {
		const onInteractionEnd = (this.parent as EraserTool).info.onInteractionEnd
		this.editor.setCurrentTool(onInteractionEnd ?? 'select')
	}
}
