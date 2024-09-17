import { Editor, Tldraw, createShapeId } from 'tldraw'

export default function BeforeDeleteShapeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					// register a handler to run before any shape is deleted:
					editor.sideEffects.registerBeforeDeleteHandler('shape', (shape) => {
						// if the shape is red, prevent the deletion:
						if ('color' in shape.props && shape.props.color === 'red') {
							return false
						}

						return
					})

					createDemoShapes(editor)
				}}
			/>
		</div>
	)
}

// create some shapes to demonstrate the side-effect we added
function createDemoShapes(editor: Editor) {
	editor
		.createShapes([
			{
				id: createShapeId(),
				type: 'text',
				props: {
					text: "Red shapes can't be deleted",
					color: 'red',
				},
			},
			{
				id: createShapeId(),
				type: 'text',
				y: 30,
				props: {
					text: 'but other shapes can',
					color: 'black',
				},
			},
		])
		.zoomToFit({ animation: { duration: 0 } })
}
