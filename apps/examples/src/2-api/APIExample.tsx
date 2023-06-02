import { App, Tldraw, TLGeoShape, useEditor } from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'
import { useEffect } from 'react'

// The tldraw component shares its App instance via its onMount callback prop.

// The App instance is tldraw's "god object". You can use the app to do
// just about everything that's possible in tldraw. Internally, the canvas
// component and all shapes, tools, and UI components use this instance to
// send events, observe changes, and perform actions.

export default function APIExample() {
	const handleMount = (app: App) => {
		// Create a shape id
		const id = app.createShapeId('hello')

		app.focus()

		// Create a shape
		app.createShapes([
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
		const shape = app.getShapeById<TLGeoShape>(id)!

		// Update the shape
		app.updateShapes([
			{
				id,
				type: 'geo',
				props: {
					h: shape.props.h * 3,
					text: 'hello world!',
				},
			},
		])

		// Select the shape
		app.select(id)

		// Rotate the shape around its center
		app.rotateShapesBy([id], Math.PI / 8)

		// Clear the selection
		app.selectNone()

		// Zoom the camera to fit both shapes
		app.zoomToFit()
	}

	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="api-example" onMount={handleMount} autoFocus={false}>
				<InsideOfAppContext />
			</Tldraw>
		</div>
	)
}

// Another (sneakier) way to access the current app is through React context.
// The Tldraw component provides the context, so you can add children to
// the component and access the app through the useEditor hook.

const InsideOfAppContext = () => {
	const app = useEditor()

	useEffect(() => {
		let i = 0

		const interval = setInterval(() => {
			const selection = [...app.selectedIds]
			app.selectAll()
			app.setProp('color', i % 2 ? 'blue' : 'light-blue')
			app.setSelectedIds(selection)
			i++
		}, 1000)

		return () => {
			clearInterval(interval)
		}
	}, [app])

	return null
}
