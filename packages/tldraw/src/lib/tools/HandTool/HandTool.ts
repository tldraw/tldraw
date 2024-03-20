import { EASINGS, StateNode, TLClickEvent } from '@tldraw/editor'
import { Dragging } from './childStates/Dragging'
import { Idle } from './childStates/Idle'
import { Pointing } from './childStates/Pointing'

/** @public */
export class HandTool extends StateNode {
	static override id = 'hand'
	static override initial = 'idle'
	static override children = () => [Idle, Pointing, Dragging]

	override onDoubleClick: TLClickEvent = (info) => {
		if (info.phase === 'settle') {
			const { currentScreenPoint } = this.editor.inputs
			this.editor.camera.zoomIn(currentScreenPoint, { duration: 220, easing: EASINGS.easeOutQuint })
		}
	}

	override onTripleClick: TLClickEvent = (info) => {
		if (info.phase === 'settle') {
			const { currentScreenPoint } = this.editor.inputs
			this.editor.camera.zoomOut(currentScreenPoint, {
				duration: 320,
				easing: EASINGS.easeOutQuint,
			})
		}
	}

	override onQuadrupleClick: TLClickEvent = (info) => {
		if (info.phase === 'settle') {
			const zoomLevel = this.editor.camera.getZoom()
			const {
				inputs: { currentScreenPoint },
			} = this.editor

			if (zoomLevel === 1) {
				this.editor.camera.zoomToFit({ duration: 400, easing: EASINGS.easeOutQuint })
			} else {
				this.editor.camera.resetZoom(currentScreenPoint, {
					duration: 320,
					easing: EASINGS.easeOutQuint,
				})
			}
		}
	}
}
