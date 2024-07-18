import {
	StateNode,
	TLInterruptEvent,
	TLKeyboardEvent,
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
	static override children = (): TLStateNodeConstructor[] => [
		Idle,
		Pointing,
		ZoomBrushing,
		ZoomQuick,
	]
	static override isLockable = false

	info = {} as TLPointerEventInfo & { onInteractionEnd?: string; isQuickZoom: boolean }
	keysPressed: string[] = []

	override onEnter = (
		info: TLPointerEventInfo & { onInteractionEnd: string; isQuickZoom: boolean }
	) => {
		this.info = info
		this.keysPressed = ['z', 'shift']
		this.parent.setCurrentToolIdMask(info.onInteractionEnd)
		this.updateCursor()
	}

	override onExit = () => {
		this.parent.setCurrentToolIdMask(undefined)
		this.editor.updateInstanceState({ zoomBrush: null, cursor: { type: 'default', rotation: 0 } })
		this.parent.setCurrentToolIdMask(undefined)
	}

	override onKeyDown: TLKeyboardEvent | undefined = () => {
		this.updateCursor()
	}

	override onKeyUp: TLKeyboardEvent = (info) => {
		if (this.info.isQuickZoom) {
			return
		}

		this.updateCursor()

		// We have to wait until both Shift and Z are released in non-Quick Zoom's case.
		// N.B. 'Ω' is Alt-Z on Mac, which can happen if you release Shift before the Alt+Z.
		this.keysPressed = this.keysPressed.filter(
			(key) => key !== info.key.toLowerCase() && info.key === 'Ω' && key !== 'z'
		)

		if (this.keysPressed.length === 0) {
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
