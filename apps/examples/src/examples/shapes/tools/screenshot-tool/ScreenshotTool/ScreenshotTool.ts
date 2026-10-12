import { StateNode } from 'tldraw'
import { ScreenshotDragging } from './childStates/Dragging'
import { ScreenshotIdle } from './childStates/Idle'
import { ScreenshotPointing } from './childStates/Pointing'

// There's a guide at the bottom of this file!

export class ScreenshotTool extends StateNode {
	// [1]
	static override id = 'screenshot'
	static override initial = 'idle'
	static override children() {
		return [ScreenshotIdle, ScreenshotPointing, ScreenshotDragging]
	}

	// [2]
	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onExit() {
		this.editor.setCursor({ type: 'default', rotation: 0 })
	}

	// [3]
	override onInterrupt() {
		this.complete()
	}

	override onCancel() {
		this.complete()
	}

	private complete() {
		this.parent.transition('select', {})
	}
}

/*
[1]
The tool is a `StateNode` with the id "screenshot" and three child states: idle, pointing, and
dragging. `initial` names the child state to enter when the tool is selected.

[2]
Set a crosshair cursor while the tool is active and restore the default on exit.

[3]
Interrupt (e.g. a pinch gesture starts) and cancel (escape) both bail out to the select tool.
`this.parent` is the root state, whose children are the tools.
*/
