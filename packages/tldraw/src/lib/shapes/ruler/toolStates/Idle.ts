import { StateNode } from '@tldraw/editor'

export class Idle extends StateNode {
	static override id = 'idle'

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onPointerDown() {
		this.parent.transition('pointing')
	}

	override onCancel() {
		this.editor.setCurrentTool('select')
	}
}
