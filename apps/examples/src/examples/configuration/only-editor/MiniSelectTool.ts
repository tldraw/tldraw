import { StateNode, TLClickEventInfo, TLPointerEventInfo, TLShape, createShapeId } from 'tldraw'
// There's a guide at the bottom of this file!

// [1]
export class MiniSelectTool extends StateNode {
	static override id = 'select'
	static override children() {
		return [IdleState, PointingState, DraggingState]
	}
	static override initial = 'idle'
}
// [2]
class IdleState extends StateNode {
	static override id = 'idle'
	// [a]
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
				if (editor.inputs.getShiftKey()) {
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
	// [b]
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

// [3]
class PointingState extends StateNode {
	static override id = 'pointing'
	// [a]
	override onPointerUp(info: TLPointerEventInfo) {
		this.parent.transition('idle', info)
	}
	// [b]
	override onPointerMove() {
		if (this.editor.inputs.getIsDragging()) {
			this.parent.transition('dragging', { shapes: [...this.editor.getSelectedShapes()] })
		}
	}
}

// [4]
class DraggingState extends StateNode {
	static override id = 'dragging'
	private initialDraggingShapes: TLShape[] = []
	// [a]
	override onEnter(info: { shapes: TLShape[] }) {
		this.initialDraggingShapes = info.shapes
	}
	override onPointerUp(info: TLPointerEventInfo) {
		this.parent.transition('idle', info)
	}
	// [b]
	override onPointerMove() {
		const { initialDraggingShapes } = this
		const originPagePoint = this.editor.inputs.getOriginPagePoint()
		const currentPagePoint = this.editor.inputs.getCurrentPagePoint()

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
Tools are nodes in the editor's state chart (https://tldraw.dev/docs/tools). This tool has
three child states, idle [2], pointing [3], and dragging [4]; exactly one is active at a time,
and events go to the active child. A child calls `this.parent.transition(id, info)` to hand
control to a sibling; the sibling's `onEnter` receives `info`, which is how data moves between
states.

[1]
The tool itself only declares its id, its children, and which child starts active.

[2]
Idle is where the tool waits for input.

	[a] Pointer events arrive with a `target` of 'canvas' or 'shape'. A hit on the canvas can
		still land on a shape (for example inside a hollow shape), so we re-check with
		`getShapeAtPoint` and re-dispatch as a 'shape' event. Pointing a shape selects it (or
		adds it with shift) and moves to pointing so a drag can begin.

	[b] Double-click fires once per phase ('down', 'up', 'settle-down', 'settle-up'); we only act
		on 'up' so the shape is created or deleted once.

[3]
Pointing exists to tell a click from a drag.

	[a] Pointer up without moving far enough: back to idle.
	[b] `editor.inputs.getIsDragging()` becomes true once the pointer has moved past the drag
		threshold. We then move to dragging and hand it the shapes to move.

[4]
Dragging moves the selected shapes.

	[a] The shapes captured on enter keep their original positions, so each move can be computed
		from the pointer's total offset since the drag started rather than accumulated deltas.
	[b] `getOriginPagePoint()` is where the pointer went down; the difference to
		`getCurrentPagePoint()` is applied to each shape's starting position with
		`editor.updateShapes()`.
*/
