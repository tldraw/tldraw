import { StateNode, TLEventHandlers } from 'tldraw'

export class CircleClipShapeTool extends StateNode {
	static override id = 'circle-clip'

	override onEnter(): void {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onPointerDown(info: Parameters<TLEventHandlers['onPointerDown']>[0]) {
		if (info.target === 'canvas') {
			const originPagePoint = this.editor.inputs.getOriginPagePoint()

			this.editor.createShape({
				type: 'circle-clip',
				x: originPagePoint.x - 100,
				y: originPagePoint.y - 100,
				props: {
					w: 200,
					h: 200,
				},
			})
		}
	}
}
