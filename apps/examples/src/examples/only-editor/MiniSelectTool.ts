import {
	StateNode,
	TLEventHandlers,
	TLGroupShape,
	TLUnknownShape,
	createShapeId,
} from '@tldraw/tldraw'

/*
This is a bigger example of a state node that implements a "select" tool.

The state has three children: idle, pointing, and dragging. Only one child
state can be "active" at a time. The parent state's initial active state is
"idle". Certain events received by the child states will cause the parent
state to transition to another child state, making that state active instead.

Note that when `transition()` is called, the parent state will call the new
active state(s)'s `onEnter` method with the second argument passed to the
transition method. This is useful for passing data between states.
*/

class IdleState extends StateNode {
	static override id = 'idle'

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
			case 'selection': {
				this.parent.transition('pointing', info)
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

class PointingState extends StateNode {
	static override id = 'pointing'

	override onPointerUp: TLEventHandlers['onPointerUp'] = (info) => {
		this.parent.transition('idle', info)
	}

	override onPointerMove: TLEventHandlers['onPointerUp'] = () => {
		if (this.editor.inputs.isDragging) {
			this.parent.transition('dragging', { shapes: [...this.editor.getSelectedShapes()] })
		}
	}
}

class DraggingState extends StateNode {
	static override id = 'dragging'

	private initialDraggingShapes = [] as TLUnknownShape[]

	override onEnter = (info: { shapes: TLUnknownShape[] }) => {
		this.initialDraggingShapes = info.shapes
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = (info) => {
		this.parent.transition('idle', info)
	}

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

export class MiniSelectTool extends StateNode {
	static override id = 'select'
	static override children = () => [IdleState, PointingState, DraggingState]
	static override initial = 'idle'
}
