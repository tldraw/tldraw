import { Editor, Tldraw, createShapeId } from 'tldraw'

export default function AfterDeleteShapeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					// register a handler to run after any shape is deleted:
					editor.sideEffects.registerAfterDeleteHandler('shape', (shape) => {
						// grab the parent of the shape and check if it's a frame:
						const parentShape = editor.getShape(shape.parentId)
						if (parentShape && parentShape.type === 'frame') {
							// if it is, get the IDs of all its remaining children:
							const siblings = editor.getSortedChildIdsForParent(parentShape.id)

							// if there are none (so the frame is empty), delete the frame:
							if (siblings.length === 0) {
								editor.deleteShape(parentShape.id)
							}
						}
					})

					createDemoShapes(editor)
				}}
			/>
		</div>
	)
}

// crate some demo shapes to show off the new side-effect we added
function createDemoShapes(editor: Editor) {
	const frameId = createShapeId()
	editor.createShapes([
		{
			id: frameId,
			type: 'frame',
			props: { w: 400, h: 200 },
		},
		{
			id: createShapeId(),
			type: 'text',
			parentId: frameId,
			x: 50,
			y: 40,
			props: {
				text: 'Frames will be deleted when their last child is.',
				w: 300,
				autoSize: false,
			},
		},
		...[50, 180, 310].map((x) => ({
			id: createShapeId(),
			type: 'geo',
			parentId: frameId,
			x,
			y: 120,
			props: { w: 40, h: 40 },
		})),
	])

	editor.zoomToFit({ animation: { duration: 0 } })
}
