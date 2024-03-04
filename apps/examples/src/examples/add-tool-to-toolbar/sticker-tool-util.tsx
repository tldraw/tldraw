import { StateNode } from 'tldraw'

export class StickerTool extends StateNode {
	static override id = 'sticker'

	override onEnter = () => {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onPointerDown = () => {
		const { currentPagePoint } = this.editor.inputs
		this.editor.createShape({
			type: 'text',
			x: currentPagePoint.x,
			y: currentPagePoint.y,
			props: { text: '❤️' },
		})
	}
}
