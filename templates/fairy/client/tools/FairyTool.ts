import { StateNode } from 'tldraw'

// Fairy tool - creates fairy shapes on click
export class FairyTool extends StateNode {
	static override id = 'fairy'

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onPointerDown() {
		const { currentPagePoint } = this.editor.inputs
		this.editor.createShape({
			type: 'fairy',
			x: currentPagePoint.x - 50, // Center the shape (FAIRY_SIZE / 2)
			y: currentPagePoint.y - 50,
		})
	}
}
