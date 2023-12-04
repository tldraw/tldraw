import { StateNode, TLCancelEvent, TLInterruptEvent } from '@tldraw/tldraw'
import { ScreenshotDragging } from './childStates/Dragging'
import { ScreenshotIdle } from './childStates/Idle'
import { ScreenshotPointing } from './childStates/Pointing'

// There's a guide at the bottom of this file!

export class ScreenshotTool extends StateNode {
	// [1]
	static override id = 'screenshot'
	static override initial = 'idle'
	static override children = () => [ScreenshotIdle, ScreenshotPointing, ScreenshotDragging]

	// [2]
	override onEnter = () => {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onExit = () => {
		this.editor.setCursor({ type: 'default', rotation: 0 })
	}

	// [3]
	override onInterrupt: TLInterruptEvent = () => {
		this.complete()
	}

	override onCancel: TLCancelEvent = () => {
		this.complete()
	}

	private complete() {
		this.parent.transition('select', {})
	}
}

/*
This file contains our screenshot tool. The tool is a StateNode with the `id` "screenshot".

[1]
It has three child state nodes, ScreenshotIdle, ScreenshotPointing, and ScreenshotDragging. 
Its initial state is `idle`.

[2]
When the screenshot tool is entered, we set the cursor to a crosshair. When it is exited, we
set the cursor back to the default cursor. 

[3]
When the screenshot tool is interrupted or cancelled, we transition back to the select tool.
*/
