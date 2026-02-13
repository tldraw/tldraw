import { StateNode, TLPointerEventInfo, Tldraw, createShapeId } from 'tldraw'
import 'tldraw/tldraw.css'

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
				// Change fill to semi-transparent after dragging
				this.editor.updateShape({
					id: shapeId,
					type: 'geo',
					props: { fill: 'pattern' },
				})
				// Return to our custom tool
				this.editor.setCurrentTool('quick-shape')
			},
		})
	}
}

export default function InteractionEndExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw tools={[QuickShapeTool]} initialState="quick-shape" hideUi />
		</div>
	)
}

/*
[1]
Create a simple tool that creates shapes on click. This demonstrates using
onInteractionEnd to control what happens after the user drags the new shape.

[2]
After creating the shape, transition to the translating state so the user can
immediately position it.

[3]
Pass a function as onInteractionEnd to execute custom logic when dragging ends.
Here we change the shape's fill style and return to our custom tool. You can also
pass a string like 'quick-shape' or 'select.idle' to simply transition to that tool.
*/
