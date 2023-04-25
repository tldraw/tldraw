import { EASINGS } from '@tldraw/primitives'
import { TLClickEvent } from '../../types/event-types'
import { StateNode } from '../StateNode'

import { Dragging } from './children/Dragging'
import { Idle } from './children/Idle'
import { Pointing } from './children/Pointing'

export class TLHandTool extends StateNode {
	static override id = 'hand'
	static initial = 'idle'
	static children = () => [Idle, Pointing, Dragging]

	styles = []

	onDoubleClick: TLClickEvent = (info) => {
		if (info.phase === 'settle') {
			const { currentScreenPoint } = this.app.inputs
			this.app.zoomIn(currentScreenPoint, { duration: 220, easing: EASINGS.easeOutQuint })
		}
	}

	onTripleClick: TLClickEvent = (info) => {
		if (info.phase === 'settle') {
			const { currentScreenPoint } = this.app.inputs
			this.app.zoomOut(currentScreenPoint, { duration: 320, easing: EASINGS.easeOutQuint })
		}
	}

	onQuadrupleClick: TLClickEvent = (info) => {
		if (info.phase === 'settle') {
			const {
				zoomLevel,
				inputs: { currentScreenPoint },
			} = this.app

			if (zoomLevel === 1) {
				this.app.zoomToFit({ duration: 400, easing: EASINGS.easeOutQuint })
			} else {
				this.app.resetZoom(currentScreenPoint, { duration: 320, easing: EASINGS.easeOutQuint })
			}
		}
	}
}
