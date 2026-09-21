import { StateNode, TLClickEventInfo, TLPointerEventInfo, createShapeId } from 'tldraw'

// There's a guide at the bottom of this file!

// [1]
export class MicroSelectTool extends StateNode {
	static override id = 'select'
	// [2]
	override onPointerDown(info: TLPointerEventInfo) {
		const { editor } = this

		switch (info.target) {
			case 'canvas': {
				const hitShape = editor.getShapeAtPoint(editor.inputs.getCurrentPagePoint())

				if (hitShape) {
					this.onPointerDown({
						...info,
						shape: hitShape,
						target: 'shape',
					})
					return
				}

				editor.selectNone()
				break
			}
			case 'shape': {
				editor.select(info.shape.id)
				break
			}
		}
	}
	// [3]
	override onDoubleClick(info: TLClickEventInfo) {
		const { editor } = this

		if (info.phase !== 'up') return

		switch (info.target) {
			case 'canvas': {
				const hitShape = editor.getShapeAtPoint(editor.inputs.getCurrentPagePoint())

				if (hitShape) {
					this.onDoubleClick({
						...info,
						shape: hitShape,
						target: 'shape',
					})
					return
				}
				const currentPagePoint = editor.inputs.getCurrentPagePoint()
				editor.createShapes([
					{
						id: createShapeId(),
						type: 'box',
						x: currentPagePoint.x - 50,
						y: currentPagePoint.y - 50,
						props: {
							w: 100,
							h: 100,
						},
					},
				])
				break
			}
			case 'shape': {
				editor.deleteShapes([info.shape.id])
				break
			}
		}
	}
}
/*
The smallest possible "select" tool: a single StateNode with no child states. It isn't used by
the example; MiniSelectTool.ts is the version that's wired up.

[1]
A tool is a StateNode with a static `id`. If this tool were registered in place of MiniSelectTool,
the example's `initialState="select"` would start the editor in it. With no children, event
handlers go directly on the tool.

[2]
Pointer events arrive with a `target` of 'canvas' or 'shape'. Custom shapes rendered with
`pointerEvents: 'all'` report themselves as the target, but hits on the canvas can still land on
a shape (for example when the pointer is inside a hollow shape), so we re-check with
`getShapeAtPoint` and re-dispatch as a 'shape' event.

[3]
Double-click fires once per phase ('down', 'up', 'settle-down', 'settle-up'); we only act on
'up' so the shape is created or deleted once.
*/
