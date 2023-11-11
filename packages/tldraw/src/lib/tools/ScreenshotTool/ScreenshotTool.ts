import { StateNode, TLCancelEvent, TLInterruptEvent, TLPointerEventInfo } from '@tldraw/editor'
import { Dragging } from './children/Dragging'
import { Idle } from './children/Idle'
import { Pointing } from './children/Pointing'

/** @public */
export class ScreenshotTool extends StateNode {
	static override id = 'screenshot'
	static override initial = 'idle'
	static override children = () => [Idle, Pointing, Dragging]

	info = {} as TLPointerEventInfo & { onInteractionEnd?: string }

	override onEnter = (info: TLPointerEventInfo & { onInteractionEnd: string }) => {
		this.info = info
		this.editor.updateInstanceState(
			{ screenshotBrush: null, cursor: { type: 'cross', rotation: 0 } },
			{ ephemeral: true }
		)
	}

	override onExit = () => {
		this.editor.updateInstanceState(
			{ screenshotBrush: null, cursor: { type: 'default', rotation: 0 } },
			{ ephemeral: true }
		)
	}

	override onInterrupt: TLInterruptEvent = () => {
		this.complete()
	}

	override onCancel: TLCancelEvent = () => {
		this.complete()
	}

	private complete() {
		// Go back to the previous tool. If we are already in select we want to transition to idle
		if (this.info.onInteractionEnd && this.info.onInteractionEnd !== 'select') {
			this.editor.setCurrentTool(this.info.onInteractionEnd, this.info)
		} else {
			this.parent.transition('select', {})
		}
	}
}
