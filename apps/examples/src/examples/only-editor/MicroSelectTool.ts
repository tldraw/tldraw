import { StateNode, TLEventHandlers, createShapeId } from 'tldraw'

// There's a guide at the bottom of this file!

//[1]
export class MicroSelectTool extends StateNode {
	static override id = 'select'
	//[2]
	override onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
		const { editor } = this

		switch (info.target) {
			case 'canvas': {
				const hitShape = editor.getShapeAtPoint(editor.inputs.currentPagePoint)

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
	//[3]
	override onDoubleClick: TLEventHandlers['onDoubleClick'] = (info) => {
		const { editor } = this

		if (info.phase !== 'up') return

		switch (info.target) {
			case 'canvas': {
				const hitShape = editor.getShapeAtPoint(editor.inputs.currentPagePoint)

				if (hitShape) {
					this.onDoubleClick({
						...info,
						shape: hitShape,
						target: 'shape',
					})
					return
				}
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
/*
This is a very small example of a state node that implements a "select" tool. It
doesn't implement any children states. 

The state handles two events: onPointerDown [2] and onDoubleClick [2].

When the user points down on the canvas, it deselects all shapes; and when
they point a shape it selects that shape. When the user double clicks on the
canvas, it creates a new shape; and when they double click on a shape, it
deletes that shape.

[1]
This is where we define our state node by extending the StateNode class. Since 
there are no children states We can give it an id and define methods we
want to override to handle events.


[2] onPointerDown
	The user clicked on something, let's figure out what it was. We can
	access the editor via this.editor, and then use it to check if we hit
	a shape. If we did then we call the onPointerDown method again with the
	shape as the target, select the shape, and return. If we didn't hit a
	shape then we deselect all shapes.

[3] onDoubleClick
	The user double clicked on something, let's do the same as above. If we 
	hit a shape then we call the onDoubleClick method again with the shape as 
	the target, delete it, and return. If we didn't hit a shape then we create
	a new shape at the pointer's position.
*/
