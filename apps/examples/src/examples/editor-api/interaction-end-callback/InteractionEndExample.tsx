import { createShapeId, StateNode, TLPointerEventInfo, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1]
class QuickShapeTool extends StateNode {
	static override id = 'quick-shape'

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onPointerDown(info: TLPointerEventInfo) {
		const currentPagePoint = this.editor.inputs.getCurrentPagePoint()
		const shapeId = createShapeId()

		this.editor.createShape({
			id: shapeId,
			type: 'geo',
			x: currentPagePoint.x - 50,
			y: currentPagePoint.y - 50,
			props: { w: 100, h: 100, fill: 'solid' },
		})

		this.editor.setSelectedShapes([shapeId])

		// [2]
		this.editor.setCurrentTool('select.translating', {
			...info,
			target: 'shape',
			shape: this.editor.getShape(shapeId),
			isCreating: true,
			// [3]
			onInteractionEnd: () => {
				this.editor.updateShape({
					id: shapeId,
					type: 'geo',
					props: { fill: 'pattern' },
				})
				this.editor.setCurrentTool('quick-shape')
			},
		})
	}
}

const tools = [QuickShapeTool]

export default function InteractionEndExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw tools={tools} initialState="quick-shape" hideUi />
		</div>
	)
}

/*
[1]
A tool that creates a shape on pointer down and immediately hands off to the select tool's
translating state, so the shape follows the pointer until it's released.

[2]
`select.translating` is normally entered from `select.pointing_shape`. Entering it directly needs
the same info: the pointer event, the target shape, and `isCreating`, which tells the state that
the shape was just created so it won't Alt-clone it and will treat the drag as part of creation.

[3]
`onInteractionEnd` runs when the drag finishes. Passing a string such as 'quick-shape' mainly
masks the current tool id, so the UI keeps showing that tool during the drag; it only switches
back to it on completion when tool lock is on. Passing a function lets you do more first. Here we swap the fill
to a pattern and then return to this tool so the next click creates another shape.
*/
