import { TLInterruptEvent, TLKeyboardEvent, TLPointerEventInfo } from '../../types/event-types'
import { StateNode } from '../StateNode'
import { Idle } from './children/Idle'
import { Pointing } from './children/Pointing'
import { ZoomBrushing } from './children/ZoomBrushing'

export class ZoomTool extends StateNode {
	static override id = 'zoom'
	static initial = 'idle'
	static children = () => [Idle, ZoomBrushing, Pointing]

	info = {} as TLPointerEventInfo & { onInteractionEnd?: string }

	onEnter = (info: TLPointerEventInfo & { onInteractionEnd: string }) => {
		this.info = info
		this.updateCursor()
	}

	updateCursor() {
		if (this.editor.inputs.altKey) {
			this.editor.setCursor({ type: 'zoom-out' })
		} else {
			this.editor.setCursor({ type: 'zoom-in' })
		}
	}

	onExit = () => {
		this.editor.setZoomBrush(null)
		this.editor.setCursor({ type: 'default' })
	}

	onKeyDown: TLKeyboardEvent | undefined = () => {
		this.updateCursor()
	}

	onKeyUp: TLKeyboardEvent = (info) => {
		this.updateCursor()

		if (info.code === 'KeyZ') {
			this.complete()
		}
	}

	onInterrupt: TLInterruptEvent = () => {
		this.complete()
	}

	private complete() {
		// Go back to the previous tool. If we are already in select we want to transition to idle
		if (this.info.onInteractionEnd && this.info.onInteractionEnd !== 'select') {
			this.editor.setSelectedTool(this.info.onInteractionEnd, this.info)
		} else {
			this.parent.transition('select', {})
		}
	}
}
