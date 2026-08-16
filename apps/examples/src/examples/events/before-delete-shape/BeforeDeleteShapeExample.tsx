import { Editor, Tldraw, createShapeId, toRichText } from 'tldraw'
import 'tldraw/tldraw.css'

export default function BeforeDeleteShapeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					// Returning false from a before-delete handler cancels the deletion. Returning
					// nothing lets it go ahead.
					editor.sideEffects.registerBeforeDeleteHandler('shape', (shape) => {
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

function createDemoShapes(editor: Editor) {
	editor
		.createShapes([
			{
				id: createShapeId(),
				type: 'text',
				props: {
					richText: toRichText("Red shapes can't be deleted"),
					color: 'red',
				},
			},
			{
				id: createShapeId(),
				type: 'text',
				y: 30,
				props: {
					richText: toRichText('but other shapes can'),
					color: 'black',
				},
			},
		])
		.zoomToFit({ animation: { duration: 0 } })
}
