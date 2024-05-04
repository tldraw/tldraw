import { Editor, TLShape, TLShapeId, Tldraw, createShapeId } from 'tldraw'

// this function takes a shape ID, and if that shape is red, sets all other red shapes on the same
// page to black.
function ensureOnlyOneRedShape(editor: Editor, shapeId: TLShapeId) {
	// grab the shape and check it's red:
	const shape = editor.getShape(shapeId)!
	if (!isRedShape(shape)) return

	// get the ID of the page that shape belongs to:
	const pageId = editor.getAncestorPageId(shape.id)!

	// find any other red shapes on the same page:
	const otherRedShapesOnPage = Array.from(editor.getPageShapeIds(pageId))
		.map((id) => editor.getShape(id)!)
		.filter((otherShape) => otherShape.id !== shape.id && isRedShape(otherShape))

	// set the color of all those shapes to black:
	editor.updateShapes(
		otherRedShapesOnPage.map((shape) => ({
			id: shape.id,
			type: shape.type,
			props: {
				color: 'black',
			},
		}))
	)
}

function isRedShape(shape: TLShape) {
	return 'color' in shape.props && shape.props.color === 'red'
}

export default function AfterCreateUpdateShapeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					// we can run our `ensureOnlyOneRedShape` function after any shape is created or
					// changed. this means we can enforce our "only one red shape at a time" rule,
					// whilst making sure that the shape most recently set to red is the one that
					// stays red.
					editor.sideEffects.registerAfterCreateHandler('shape', (shape) => {
						ensureOnlyOneRedShape(editor, shape.id)
					})
					editor.sideEffects.registerAfterChangeHandler('shape', (prevShape, nextShape) => {
						ensureOnlyOneRedShape(editor, nextShape.id)
					})

					createDemoShapes(editor)
				}}
			/>
		</div>
	)
}

// create some shapes to demonstrate the side-effects we added
function createDemoShapes(editor: Editor) {
	editor
		.createShapes(
			'there can only be one red shape'.split(' ').map((word, i) => ({
				id: createShapeId(),
				type: 'text',
				y: i * 30,
				props: {
					color: i === 5 ? 'red' : 'black',
					text: word,
				},
			}))
		)
		.zoomToFit({ animation: { duration: 0 } })
}
