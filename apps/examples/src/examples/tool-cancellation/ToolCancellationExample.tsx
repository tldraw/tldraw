import {
	StateNode,
	TLGeoShape,
	TLPointerEventInfo,
	TLShapeId,
	Tldraw,
	createShapeId,
	toRichText,
} from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1]
class RectangleTool extends StateNode {
	static override id = 'rectangle'
	static override initial = 'idle'
	static override children() {
		return [Idle, Pointing, Dragging]
	}

	// [2]
	override onInterrupt() {
		this.complete()
	}

	override onCancel() {
		this.complete()
	}

	private complete() {
		this.parent.transition('select')
	}
}

// [3]
class Idle extends StateNode {
	static override id = 'idle'

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onPointerDown(info: TLPointerEventInfo) {
		if (info.target === 'canvas') {
			this.parent.transition('pointing')
		}
	}
}

// [4]
class Pointing extends StateNode {
	static override id = 'pointing'

	override onPointerMove() {
		if (this.editor.inputs.getIsDragging()) {
			this.parent.transition('dragging')
		}
	}

	override onPointerUp() {
		this.parent.transition('idle')
	}
}

// [5]
class Dragging extends StateNode {
	static override id = 'dragging'

	private shapeId = '' as TLShapeId
	private markId = ''

	// [a]
	override onEnter() {
		// Create a fresh shape ID for this drag operation
		this.shapeId = createShapeId()
		// Create a history mark so we can bail back to this point if cancelled
		this.markId = this.editor.markHistoryStoppingPoint('rectangle-tool')

		const currentPagePoint = this.editor.inputs.getCurrentPagePoint()
		// Create a preview rectangle shape
		this.editor.createShape<TLGeoShape>({
			id: this.shapeId,
			type: 'geo',
			x: currentPagePoint.x,
			y: currentPagePoint.y,
			props: {
				w: 1,
				h: 1,
				geo: 'rectangle',
			},
		})
	}

	// [b]
	override onPointerMove() {
		const originPagePoint = this.editor.inputs.getOriginPagePoint()
		const currentPagePoint = this.editor.inputs.getCurrentPagePoint()

		// Calculate the top-left corner and dimensions
		const x = Math.min(originPagePoint.x, currentPagePoint.x)
		const y = Math.min(originPagePoint.y, currentPagePoint.y)
		const w = Math.abs(currentPagePoint.x - originPagePoint.x)
		const h = Math.abs(currentPagePoint.y - originPagePoint.y)

		// Update the preview rectangle
		this.editor.updateShape<TLGeoShape>({
			id: this.shapeId,
			type: 'geo',
			x,
			y,
			props: { w, h },
		})
	}

	// [c]
	override onPointerUp() {
		this.complete()
	}

	override onComplete() {
		this.complete()
	}

	// [d]
	override onCancel() {
		// User pressed Escape - bail back to the mark (removes the preview)
		this.editor.bailToMark(this.markId)
		this.parent.transition('idle')
	}

	override onInterrupt() {
		// Tool was interrupted (e.g., user switched tools)
		// Also bail back to remove the preview
		this.editor.bailToMark(this.markId)
		this.parent.transition('idle')
	}

	// [e]
	override onExit() {
		// Clean up cursor
		this.editor.setCursor({ type: 'default', rotation: 0 })
	}

	// [f]
	private complete() {
		const shape = this.editor.getShape(this.shapeId)
		if (shape && shape.type === 'geo') {
			// Only keep the shape if it has some size
			const minSize = 10
			if (shape.props.w < minSize || shape.props.h < minSize) {
				// Too small, remove it
				this.editor.bailToMark(this.markId)
			}
			// Otherwise keep it (it's already in the history)
		}
		this.parent.transition('idle')
	}
}

// [6]
const customTools = [RectangleTool]

export default function ToolCancellationExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				tools={customTools}
				initialState="rectangle"
				hideUi
				onMount={(editor) => {
					editor.createShape({
						type: 'text',
						x: 50,
						y: 50,
						props: {
							richText: toRichText(
								'Click and drag to draw a rectangle.\n\nPress Escape to cancel.\nSwitch to Select tool (press V) to interrupt.\nRelease to complete.'
							),
							size: 's',
							textAlign: 'start',
						},
					})
				}}
			/>
		</div>
	)
}

/*
[1]
RectangleTool is a StateNode with three child states: Idle, Pointing, and Dragging.

[2]
Tool-level onInterrupt and onCancel handlers ensure clean exit from any child state.

[3]
Idle waits for pointer down, then transitions to Pointing.

[4]
Pointing detects if the user drags (transitions to Dragging) or releases (back to Idle).

[5]
Dragging handles the rectangle creation. Key methods:

	[a] onEnter: Creates a fresh shape ID, a history mark with markHistoryStoppingPoint(), then creates a preview shape.
	[b] onPointerMove: Updates the preview rectangle's position and size.
	[c] onPointerUp/onComplete: Finishes the operation via complete().
	[d] onCancel/onInterrupt: Calls bailToMark() to revert to before the shape was created.
	[e] onExit: Resets the cursor.
	[f] complete(): Bails if the shape is too small, otherwise keeps it and transitions to Idle.

[6]
Pass the custom tool to Tldraw via the tools prop and set it as the initialState.
*/
