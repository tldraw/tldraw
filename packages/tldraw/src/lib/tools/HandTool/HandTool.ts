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
		switch (info.phase) {
			case 'settle-down': {
				// A double-tap whose second press is still held down: begin one-finger
				// drag-to-zoom. This is a touch gesture, so only enter it on a coarse pointer.
				if (this.editor.getInstanceState().isCoarsePointer) {
					this.transition('one_finger_zooming', info)
				}
				break
			}
			case 'settle-up': {
				// A double-tap whose second press was released: zoom in by one step.
				const currentScreenPoint = this.editor.inputs.getCurrentScreenPoint()
				this.editor.zoomIn(currentScreenPoint, {
					animation: { duration: 220, easing: EASINGS.easeOutQuint },
				})
				break
			}
		}
	}
}
