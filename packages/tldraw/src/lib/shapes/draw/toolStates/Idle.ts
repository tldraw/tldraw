import { StateNode, TLKeyboardEventInfo, TLPointerEventInfo } from '@tldraw/editor'

export class Idle extends StateNode {
	static override id = 'idle'

	override onPointerDown(info: TLPointerEventInfo) {
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
			this.editor.setCurrentTool('eraser', { onInteractionEnd: this.parent.id })
		}
	}

	override onCancel() {
		this.editor.setCurrentTool('select')
	}
}
