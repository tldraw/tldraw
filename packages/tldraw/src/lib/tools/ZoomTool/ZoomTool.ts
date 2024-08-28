import {
	StateNode,
	TLKeyboardEventInfo,
	TLPointerEventInfo,
	TLStateNodeConstructor,
} from '@tldraw/editor'
import { Idle } from './childStates/Idle'
import { Pointing } from './childStates/Pointing'
import { ZoomBrushing } from './childStates/ZoomBrushing'

/** @public */
export class ZoomTool extends StateNode {
	static override id = 'zoom'
	static override initial = 'idle'
	static override children(): TLStateNodeConstructor[] {
		return [Idle, ZoomBrushing, Pointing]
	}
	static override isLockable = false

	info = {} as TLPointerEventInfo & { onInteractionEnd?: string }

	override onEnter(info: TLPointerEventInfo & { onInteractionEnd: string }) {
		this.info = info
		this.parent.setCurrentToolIdMask(info.onInteractionEnd)
		this.updateCursor()
	}

	override onExit() {
		this.parent.setCurrentToolIdMask(undefined)
		this.editor.updateInstanceState({ zoomBrush: null, cursor: { type: 'default', rotation: 0 } })
		this.parent.setCurrentToolIdMask(undefined)
	}

	override onKeyDown() {
		this.updateCursor()
	}

	override onKeyUp(info: TLKeyboardEventInfo) {
		this.updateCursor()

		if (info.code === 'KeyZ') {
			this.complete()
		}
	}

	override onInterrupt() {
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
			this.editor.setCursor({ type: 'zoom-out', rotation: 0 })
		} else {
			this.editor.setCursor({ type: 'zoom-in', rotation: 0 })
		}
	}
}
