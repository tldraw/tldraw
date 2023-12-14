import { StateNode, TLInterruptEvent, TLKeyboardEvent, TLPointerEventInfo } from '@tldraw/editor'
import { Idle } from './childStates/Idle'
import { Pointing } from './childStates/Pointing'
import { ZoomBrushing } from './childStates/ZoomBrushing'

/** @public */
export class ZoomTool extends StateNode {
	static override id = 'zoom'
	static override initial = 'idle'
	static override children = () => [Idle, ZoomBrushing, Pointing]

	info = {} as TLPointerEventInfo & { onInteractionEnd?: string }

	override onEnter = (info: TLPointerEventInfo & { onInteractionEnd: string }) => {
		this.info = info
		this.parent.setCurrentToolIdMask(info.onInteractionEnd)
		this.updateCursor()
	}

	override onExit = () => {
		this.parent.setCurrentToolIdMask(undefined)
		this.editor.updateInstanceState(
			{ zoomBrush: null, cursor: { type: 'default', rotation: 0 } },
			{ ephemeral: true }
		)
		this.parent.setCurrentToolIdMask(undefined)
	}

	override onKeyDown: TLKeyboardEvent | undefined = () => {
		this.updateCursor()
	}

	override onKeyUp: TLKeyboardEvent = (info) => {
		this.updateCursor()

		if (info.code === 'KeyZ') {
			this.complete()
		}
	}

	override onInterrupt: TLInterruptEvent = () => {
		this.complete()
	}

	private complete() {
		// Go back to the previous tool. If we are already in select we want to transition to idle
		if (this.info.onInteractionEnd && this.info.onInteractionEnd !== 'select') {
			this.editor.setCurrentTool(this.info.onInteractionEnd, this.info)
		} else {
			this.parent.transition('select')
		}
	}

	private updateCursor() {
		if (this.editor.inputs.altKey) {
			this.editor.updateInstanceState(
				{ cursor: { type: 'zoom-out', rotation: 0 } },
				{ ephemeral: true }
			)
		} else {
			this.editor.updateInstanceState(
				{ cursor: { type: 'zoom-in', rotation: 0 } },
				{ ephemeral: true }
			)
		}
	}
}
