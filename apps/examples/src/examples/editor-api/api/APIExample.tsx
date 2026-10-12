import { useEffect } from 'react'
import {
	createShapeId,
	DefaultColorStyle,
	Editor,
	TLGeoShape,
	Tldraw,
	toRichText,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

const STEP_MS = 1000
const TIMELINE_MS = STEP_MS * 5

// [1]
export default function APIExample() {
	const handleMount = (editor: Editor) => {
		const id = createShapeId('hello')

		// Run each API call on its own beat so a viewer can see what each one does.
		// richText is set at creation time; adding a first label later would trigger
		// the geo shape's auto-sizing and swallow the height update in step 2.
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

// [2]
const InsideOfEditorContext = () => {
	const editor = useEditor()

	useEffect(() => {
		let i = 0
		let interval: ReturnType<typeof setInterval> | undefined

		// Wait for the onMount timeline to finish so the color cycle doesn't
		// interrupt the staged setup.
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
to the canvas. The editor is tldraw's "god object": you can use it to do just
about everything that's possible in tldraw. Internally, the canvas component
and all shapes, tools, and UI components use this instance to send events,
observe changes, and perform actions.

There are two main ways to get hold of the editor:

[1]
The Tldraw component passes its editor instance to the onMount callback prop.
We schedule each API call on its own beat so a viewer can see the effect of
every step: creating the shape, updating its height, rotating it, zooming the
camera, and selecting it. The cleanup function returned from onMount cancels
any pending steps if the editor unmounts first.

[2]
Any component rendered as a child of Tldraw can read the editor from React
context with the useEditor hook. Once the timeline above finishes, this child
component takes over and demonstrates two more API calls,
setStyleForSelectedShapes and setStyleForNextShapes, by cycling the shape's
color.

*/
