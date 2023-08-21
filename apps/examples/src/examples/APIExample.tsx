import {
	DefaultColorStyle,
	Editor,
	TLGeoShape,
	TLShapePartial,
	Tldraw,
	createShapeId,
	useEditor,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useEffect } from 'react'

// The tldraw component shares its App instance via its onMount callback prop.

// The App instance is tldraw's "god object". You can use the app to do
// just about everything that's possible in tldraw. Internally, the canvas
// component and all shapes, tools, and UI components use this instance to
// send events, observe changes, and perform actions.

export default function APIExample() {
	const handleMount = (editor: Editor) => {
		// Create a shape id
		const id = createShapeId('hello')

		// Create a shape
		editor.createShapes<TLGeoShape>([
			{
				id,
				type: 'geo',
				x: 128 + Math.random() * 500,
				y: 128 + Math.random() * 500,
				props: {
					geo: 'rectangle',
					w: 100,
					h: 100,
					dash: 'draw',
					color: 'blue',
					size: 'm',
				},
			},
		])

		// Get the created shape
		const shape = editor.getShape<TLGeoShape>(id)!

		const shapeUpdate: TLShapePartial<TLGeoShape> = {
			id,
			type: 'geo',
			props: {
				h: shape.props.h * 3,
				text: 'hello world!',
			},
		}

		// Update the shape
		editor.updateShapes([shapeUpdate])

		// Select the shape
		editor.select(id)

		// Rotate the shape around its center
		editor.rotateShapesBy([id], Math.PI / 8)

		// Clear the selection
		editor.selectNone()

		// Zoom the camera to fit both shapes
		editor.zoomToFit()
	}

	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="api-example" onMount={handleMount}>
				<InsideOfEditorContext />
			</Tldraw>
		</div>
	)
}

// Another (sneakier) way to access the current app is through React context.
// The Tldraw component provides the context, so you can add children to
// the component and access the app through the useEditor hook.

const InsideOfEditorContext = () => {
	const editor = useEditor()

	useEffect(() => {
		let i = 0

		const interval = setInterval(() => {
			const selection = [...editor.selectedShapeIds]
			editor.selectAll()
			editor.setStyleForSelectedShapes(DefaultColorStyle, i % 2 ? 'blue' : 'light-blue')
			editor.setStyleForNextShapes(DefaultColorStyle, i % 2 ? 'blue' : 'light-blue')
			editor.setSelectedShapes(selection)
			i++
		}, 1000)

		return () => {
			clearInterval(interval)
		}
	}, [editor])

	return null
}
