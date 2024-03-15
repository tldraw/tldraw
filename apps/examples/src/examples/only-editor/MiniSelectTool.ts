import { StateNode, TLEventHandlers, TLUnknownShape, createShapeId } from 'tldraw'
// There's a guide at the bottom of this file!

//[1]
export class MiniSelectTool extends StateNode {
	static override id = 'select'
	static override children = () => [IdleState, PointingState, DraggingState]
	static override initial = 'idle'
}
//[2]
class IdleState extends StateNode {
	static override id = 'idle'
	//[a]
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
				if (editor.inputs.shiftKey) {
					editor.select(...editor.getSelectedShapeIds(), info.shape.id)
				} else {
					if (!editor.getSelectedShapeIds().includes(info.shape.id)) {
						editor.select(info.shape.id)
					}
					this.parent.transition('pointing', info)
				}
				break
			}
		}
	}
	//[b]
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

//[3]
class PointingState extends StateNode {
	static override id = 'pointing'
	//[a]
	override onPointerUp: TLEventHandlers['onPointerUp'] = (info) => {
		this.parent.transition('idle', info)
	}
	//[b]
	override onPointerMove: TLEventHandlers['onPointerUp'] = () => {
		if (this.editor.inputs.isDragging) {
			this.parent.transition('dragging', { shapes: [...this.editor.getSelectedShapes()] })
		}
	}
}

//[4]
class DraggingState extends StateNode {
	static override id = 'dragging'
	//[a]
	private initialDraggingShapes = [] as TLUnknownShape[]
	//[b]
	override onEnter = (info: { shapes: TLUnknownShape[] }) => {
		this.initialDraggingShapes = info.shapes
	}
	//[c]
	override onPointerUp: TLEventHandlers['onPointerUp'] = (info) => {
		this.parent.transition('idle', info)
	}
	//[d]
	override onPointerMove: TLEventHandlers['onPointerUp'] = () => {
		const { initialDraggingShapes } = this
		const { originPagePoint, currentPagePoint } = this.editor.inputs

		this.editor.updateShapes(
			initialDraggingShapes.map((shape) => {
				return {
					...shape,
					x: shape.x + (currentPagePoint.x - originPagePoint.x),
					y: shape.y + (currentPagePoint.y - originPagePoint.y),
				}
			})
		)
	}
}

/*
This is where we implement our select tool. In tldraw, tools are part of the
tldraw state chart. Check out the docs for more info: 
https://tldraw.dev/docs/editor#State-Chart


Our state node [1] has three children: idle [2], pointing [3], and dragging [4]. 
Only one child state can be "active" at a time. The parent state's initial active 
state is "idle". Certain events received by the child states will cause the parent
state to transition to another child state, making that state active instead.

Note that when `transition()` is called, the parent state will call the new
active state(s)'s `onEnter` method with the second argument passed to the
transition method. This is useful for passing data between states.

[1] 
This is where we define our state node by extending the StateNode class. We 
give it an id, a list of children states, and its initial active state.

[2]
The idle state is the tool's default state. This is where most of the action is.
We have some handy methods available to help us handle events:
	
	[a] onPointerDown
		The user clicked on something, let's figure out what it was. We can
		access the editor via this.editor, and then use it to check if we hit
		a shape. If we did then we call the onPointerDown method again with the
		shape as the target, select the shape and transition to the pointing state. 
		Otherwise we deselect everything.
	
	[b] onDoubleClick
		The user double clicked on something, let's do the same thing as above.
		If we hit a shape then we call the onDoubleClick method again with the
		shape as the target, and delete the shape. Otherwise we create a new shape.

[3]
The pointing state is something of a transitionary state. Its job is to transition 
to the dragging state when the user starts dragging, or go back to the idle state 
on pointer up.

	[a] onPointerUp
		The user let go of the mouse, let's go back to the idle state.
	[b] onPointerMove
		The user moved the mouse, let's double check they're dragging. If they are
		then let's transition to the dragging state and pass it the shapes that
		are being dragged.

[4]
The dragging state is where we actually move the shapes around. It's job is to
update the position of the shapes being dragged, and transition back to the idle
state when the user lets go of the mouse.

	[a] initialDraggingShapes
		We'll use this to keep track of the shapes being dragged when we enter
		the state.

	[b] onEnter
		When we enter the dragging state, we'll save the shapes being dragged.

	[c] onPointerUp
		The user let go of the mouse, let's go back to the idle state.

	[d] onPointerMove
		The user moved the mouse, let's update the position of the shapes being
		dragged using editor.updateShapes().
*/
