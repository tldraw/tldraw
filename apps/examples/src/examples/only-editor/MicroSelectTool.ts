import { StateNode, TLEventHandlers, TLGroupShape, createShapeId } from '@tldraw/tldraw'

/*
This is a very small example of a state node that implements a "select" tool.

The state handles two events: onPointerDown and onDoubleClick.

When the user points down on the canvas, it deselects all shapes; and when
they point a shape it selects that shape. When the user double clicks on the
canvas, it creates a new shape; and when they double click on a shape, it
deletes that shape.
*/

export class MicroSelectTool extends StateNode {
	static override id = 'select'

	override onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
		const { editor } = this

		switch (info.target) {
			case 'canvas': {
				const hoveredShape = editor.getHoveredShape()
				const hitShape =
					hoveredShape && !this.editor.isShapeOfType<TLGroupShape>(hoveredShape, 'group')
						? hoveredShape
						: this.editor.getShapeAtPoint(this.editor.inputs.currentPagePoint, {
								renderingOnly: true,
						  })

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

	override onDoubleClick: TLEventHandlers['onDoubleClick'] = (info) => {
		const { editor } = this

		if (info.phase !== 'up') return

		switch (info.target) {
			case 'canvas': {
				const { currentPagePoint } = editor.inputs
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
