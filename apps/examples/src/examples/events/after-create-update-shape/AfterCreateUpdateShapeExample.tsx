import {
	Editor,
	TLShape,
	TLShapeId,
	TLShapePartial,
	Tldraw,
	createShapeId,
	toRichText,
} from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

type ShapeWithColor = Extract<TLShape, { props: { color: string } }>

// [1]
function ensureOnlyOneRedShape(editor: Editor, shapeId: TLShapeId) {
	const shape = editor.getShape(shapeId)!
	if (!isRedShape(shape)) return

	const pageId = editor.getAncestorPageId(shape.id)!

	const otherRedShapesOnPage = Array.from(editor.getPageShapeIds(pageId))
		.map((id) => editor.getShape(id)!)
		.filter(
			(otherShape): otherShape is ShapeWithColor =>
				otherShape.id !== shape.id && isRedShape(otherShape)
		)

	editor.updateShapes(
		otherRedShapesOnPage.map(
			(shape) =>
				({
					id: shape.id,
					type: shape.type,
					props: { color: 'black' },
				}) as TLShapePartial // [2]
		)
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
					// [3]
					editor.sideEffects.registerAfterCreateHandler('shape', (shape) => {
						ensureOnlyOneRedShape(editor, shape.id)
					})
					editor.sideEffects.registerAfterChangeHandler('shape', (_prevShape, nextShape) => {
						ensureOnlyOneRedShape(editor, nextShape.id)
					})

					createDemoShapes(editor)
				}}
			/>
		</div>
	)
}

function createDemoShapes(editor: Editor) {
	editor
		.createShapes(
			'there can only be one red shape'.split(' ').map((word, i) => ({
				id: createShapeId(),
				type: 'text',
				y: i * 30,
				props: {
					color: i === 5 ? 'red' : 'black',
					richText: toRichText(word),
				},
			}))
		)
		.zoomToFit({ animation: { duration: 0 } })
}

/*
[1]
If the given shape is red, turn every other red shape on the same page black. Not every
shape type has a `color` prop (images and videos don't, for example), so we check for it
before reading it.

[2]
`ShapeWithColor` is a union of every shape type with a `color` prop, and TypeScript can't
narrow `{ type: shape.type, props: { color } }` back to one member of that union, so we assert
the partial. Each shape's `type` still comes from the shape itself, so the update is well formed.

[3]
Because `updateShapes` here triggers the after-change handler again for the shapes it turns
black, the check has to be a no-op for non-red shapes or it would loop forever.
*/
