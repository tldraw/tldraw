import {
	StateNode,
	TLKeyboardEventInfo,
	TLPointerEventInfo,
	TLStateNodeConstructor,
} from '@tldraw/editor'
import { Idle } from './childStates/Idle'
import { Pointing } from './childStates/Pointing'
import { ZoomBrushing } from './childStates/ZoomBrushing'
import { ZoomQuick } from './childStates/ZoomQuick'

/** @public */
export class ZoomTool extends StateNode {
	static override id = 'zoom'
	static override initial = 'idle'
	static override children(): TLStateNodeConstructor[] {
		return [Idle, Pointing, ZoomBrushing, ZoomQuick]
	}
	static override isLockable = false

	info = {} as TLPointerEventInfo & { onInteractionEnd?: string; isQuickZoom: boolean }

	override onEnter(info: TLPointerEventInfo & { onInteractionEnd: string; isQuickZoom: boolean }) {
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
		if (this.info.isQuickZoom) {
			return
		}

		this.updateCursor()

		if (info.key === 'z') {
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
			this.editor.setCurrentTool('select')
		}
	}

	private updateCursor() {
		if (this.editor.inputs.altKey && !this.info.isQuickZoom) {
			this.editor.setCursor({ type: 'zoom-out', rotation: 0 })
		} else {
			this.editor.setCursor({ type: 'zoom-in', rotation: 0 })
		}
	}
}
