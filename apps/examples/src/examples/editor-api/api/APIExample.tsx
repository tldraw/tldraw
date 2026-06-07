import {
	DefaultColorStyle,
	Editor,
	TLGeoShape,
	Tldraw,
	toRichText,
	createShapeId,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { useEffect } from 'react'

// There's a guide at the bottom of this file!

const STEP_MS = 1000
const TIMELINE_MS = STEP_MS * 5

//[1]
export default function APIExample() {
	const handleMount = (editor: Editor) => {
		const id = createShapeId('hello')

		// Run each API call on its own beat so a viewer can see what each one does.
		// We include richText at creation time so the later height update isn't
		// swallowed by the geo shape's first-label auto-sizing.
		const steps: (() => void)[] = [
			// 1. Create the shape
			() => {
				editor.createShapes([
					{
						id,
						type: 'geo',
						x: 128 + Math.random() * 500,
						y: 128 + Math.random() * 500,
						props: {
							geo: 'rectangle',
							w: 120,
							h: 100,
							dash: 'draw',
							color: 'blue',
							size: 'm',
							richText: toRichText('hello world!'),
						},
					},
				])
			},
			// 2. Triple the shape's height
			() => {
				const shape = editor.getShape<TLGeoShape>(id)!
				editor.updateShape({
					id,
					type: 'geo',
					props: { h: shape.props.h * 3 },
				})
			},
			// 3. Rotate the shape around its center
			() => editor.rotateShapesBy([id], Math.PI / 8),
			// 4. Zoom the camera to fit the shape
			() => editor.zoomToFit(),
			// 5. Select the shape
			() => editor.select(id),
		]

		const timeouts = steps.map((step, i) => setTimeout(step, i * STEP_MS))

		return () => {
			timeouts.forEach(clearTimeout)
		}
	}

	return (
		<div className="tldraw__editor">
			<Tldraw onMount={handleMount}>
				<InsideOfEditorContext />
			</Tldraw>
		</div>
	)
}

//[2]
const InsideOfEditorContext = () => {
	const editor = useEditor()

	useEffect(() => {
		let i = 0
		let interval: ReturnType<typeof setInterval> | undefined

		// Wait until the onMount timeline finishes before starting the color cycle,
		// so the staged setup isn't visually interrupted.
		const start = setTimeout(() => {
			interval = setInterval(() => {
				const selection = [...editor.getSelectedShapeIds()]
				editor.selectAll()
				editor.setStyleForSelectedShapes(DefaultColorStyle, i % 2 ? 'blue' : 'light-blue')
				editor.setStyleForNextShapes(DefaultColorStyle, i % 2 ? 'blue' : 'light-blue')
				editor.setSelectedShapes(selection)
				i++
			}, STEP_MS)
		}, TIMELINE_MS)

		return () => {
			clearTimeout(start)
			if (interval) clearInterval(interval)
		}
	}, [editor])

	return null
}

/*
Introduction:

This example shows how to use the tldraw editor instance to make changes
to the canvas. The editor instance is tldraw's "god object". You can use
the app to do just about everything that's possible in tldraw. Internally,
the canvas component and all shapes, tools, and UI components use this instance
to send events, observe changes, and perform actions.

There are two main ways to use the editor:

[1]
The tldraw component shares its editor instance via its onMount callback prop.
When you define a function for the onMount callback, it receives the editor
instance as an argument. We schedule each API call on its own beat so a viewer
can see the effect of every step: creating the shape, updating its height,
rotating it, zooming the camera, and selecting it. The cleanup function
returned from onMount cancels any pending steps if the editor unmounts.


[2]
Another (sneakier) way to access the current app is through React context.
The Tldraw component provides the context, so you can add children to
the component and access the app through the useEditor hook. Once the timeline
above finishes, this child component takes over and demonstrates a couple more
API calls — setStyleForSelectedShapes and setStyleForNextShapes — by cycling
the shape's color.

*/
