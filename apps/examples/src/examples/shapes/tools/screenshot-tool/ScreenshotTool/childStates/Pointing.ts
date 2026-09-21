import { StateNode } from 'tldraw'

// There's a guide at the bottom of this file!

export class ScreenshotPointing extends StateNode {
	static override id = 'pointing'

	// [1]
	override onPointerMove() {
		if (this.editor.inputs.getIsDragging()) {
			this.parent.transition('dragging')
		}
	}

	// [2]
	override onPointerUp() {
		this.complete()
	}

	override onCancel() {
		this.complete()
	}

	private complete() {
		this.parent.transition('idle')
	}
}

/*
[1]
`inputs.getIsDragging()` becomes true once the pointer has moved past the drag distance
threshold since pointer down. Until then we stay here, so a plain click never starts a box.

[2]
A pointer up or cancel before the drag threshold is a click, not a screenshot, so go back to idle.
*/
