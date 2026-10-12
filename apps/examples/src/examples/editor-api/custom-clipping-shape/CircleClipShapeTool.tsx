import { StateNode, TLPointerEventInfo } from 'tldraw'

export class CircleClipShapeTool extends StateNode {
	static override id = 'circle-clip'

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onPointerDown(info: TLPointerEventInfo) {
		if (info.target !== 'canvas') return

		const { x, y } = this.editor.inputs.getCurrentPagePoint()
		this.editor.createShape({
			type: 'circle-clip',
			x: x - 100,
			y: y - 100,
			props: { w: 200, h: 200 },
		})
	}
}
