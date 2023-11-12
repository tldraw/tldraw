import { StateNode, TLCancelEvent, TLInterruptEvent } from '@tldraw/tldraw'
import { ScreenshotDragging } from './children/Dragging'
import { ScreenshotIdle } from './children/Idle'
import { ScreenshotPointing } from './children/Pointing'

// There's a guide at the bottom of this file!

export class ScreenshotTool extends StateNode {
	// [1]
	static override id = 'screenshot'
	static override initial = 'idle'
	static override children = () => [ScreenshotIdle, ScreenshotPointing, ScreenshotDragging]

	// [3]
	override onEnter = () => {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onExit = () => {
		this.editor.setCursor({ type: 'default', rotation: 0 })
	}

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
It has three child state nodes, Idle, Pointing, and Dragging. Its initial state is `idle`.

[2]
This state has a reactive property, `screenshotBrush`, which will keep track of the bounds
of the brush as we draw it.
*/
