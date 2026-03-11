import { EASINGS, StateNode, TLClickEventInfo, TLStateNodeConstructor } from '@tldraw/editor'
import { Dragging } from './childStates/Dragging'
import { Idle } from './childStates/Idle'
import { OneFingerZooming } from './childStates/OneFingerZooming'
import { Pointing } from './childStates/Pointing'

/** @public */
export class HandTool extends StateNode {
	static override id = 'hand'
	static override initial = 'idle'
	static override isLockable = false
	static override children(): TLStateNodeConstructor[] {
		return [Idle, Pointing, Dragging, OneFingerZooming]
	}

	override onDoubleClick(info: TLClickEventInfo) {
		if (info.phase === 'settle-up') {
			const currentScreenPoint = this.editor.inputs.getCurrentScreenPoint()
			this.editor.zoomIn(currentScreenPoint, {
				animation: { duration: 220, easing: EASINGS.easeOutQuint },
			})
		}
	}
}
