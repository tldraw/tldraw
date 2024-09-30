import { EASINGS, StateNode, TLClickEventInfo, TLStateNodeConstructor } from '@tldraw/editor'
import { Dragging } from './childStates/Dragging'
import { Idle } from './childStates/Idle'
import { Pointing } from './childStates/Pointing'

/** @public */
export class HandTool extends StateNode {
	static override id = 'hand'
	static override initial = 'idle'
	static override isLockable = false
	static override children(): TLStateNodeConstructor[] {
		return [Idle, Pointing, Dragging]
	}

	override onDoubleClick(info: TLClickEventInfo) {
		if (info.phase === 'settle') {
			const { currentScreenPoint } = this.editor.inputs
			this.editor.zoomIn(currentScreenPoint, {
				animation: { duration: 220, easing: EASINGS.easeOutQuint },
			})
		}
	}

	override onTripleClick(info: TLClickEventInfo) {
		if (info.phase === 'settle') {
			const { currentScreenPoint } = this.editor.inputs
			this.editor.zoomOut(currentScreenPoint, {
				animation: { duration: 320, easing: EASINGS.easeOutQuint },
			})
		}
	}

	override onQuadrupleClick(info: TLClickEventInfo) {
		if (info.phase === 'settle') {
			const zoomLevel = this.editor.getZoomLevel()
			const {
				inputs: { currentScreenPoint },
			} = this.editor

			if (zoomLevel === 1) {
				this.editor.zoomToFit({ animation: { duration: 400, easing: EASINGS.easeOutQuint } })
			} else {
				this.editor.resetZoom(currentScreenPoint, {
					animation: { duration: 320, easing: EASINGS.easeOutQuint },
				})
			}
		}
	}
}
