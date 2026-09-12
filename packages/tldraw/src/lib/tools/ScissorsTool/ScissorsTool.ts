import { StateNode, TLStateNodeConstructor } from '@tldraw/editor'
import { Cutting } from './childStates/Cutting'
import { Idle } from './childStates/Idle'

/**
 * Draw a loop around part of the canvas to cut it free. Strokes are split at the loop, image
 * regions are cut out as new images, and the result is selected so it can be moved or copied.
 *
 * @public
 */
export class ScissorsTool extends StateNode {
	static override id = 'scissors'
	static override initial = 'idle'
	static override children(): TLStateNodeConstructor[] {
		return [Idle, Cutting]
	}
	static override isLockable = false

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onCancel() {
		// Escape drops an in-progress lasso; a second escape leaves the tool.
		if (this.getCurrent()?.id === 'cutting') {
			this.transition('idle')
		} else {
			this.editor.setCurrentTool('select')
		}
	}
}
