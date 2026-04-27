import { StateNode, TLKeyboardEventInfo, TLPointerEventInfo } from '@tldraw/editor'

export class Idle extends StateNode {
	static override id = 'idle'

	override onPointerDown(info: TLPointerEventInfo) {
		// Safety net: if accel is held when the pointer goes down (e.g. the
		// keydown switch missed because the editor wasn't focused yet), switch
		// to the eraser and forward the event so the click is treated as an erase.
		if (info.accelKey) {
			this.transitionToTransientErase(info)
			return
		}
		this.parent.transition('drawing', info)
	}

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onKeyDown(info: TLKeyboardEventInfo) {
		// Hold accel (Cmd on macOS, Ctrl elsewhere) before starting a stroke to
		// temporarily switch into the eraser tool. The originating tool stays
		// visible in the toolbar via setCurrentToolIdMask. Releasing accel
		// returns to this tool.
		if (info.accelKey && (info.key === 'Meta' || info.key === 'Control')) {
			this.transitionToTransientErase()
		}
	}

	override onCancel() {
		this.editor.setCurrentTool('select')
	}

	private transitionToTransientErase(forwardEvent?: TLPointerEventInfo) {
		this.editor.setCurrentTool('eraser', { onInteractionEnd: this.parent.id })
		// If we were triggered from a pointerDown, hand the event off to the
		// eraser tool so its idle state can transition to pointing.
		if (forwardEvent) {
			this.editor.root.handleEvent(forwardEvent)
		}
	}
}
