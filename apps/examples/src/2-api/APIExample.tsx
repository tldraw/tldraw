import { Editor, TLImageShape, Tldraw, dataUrlToFile, useEditor } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

// The tldraw component shares its App instance via its onMount callback prop.

// The App instance is tldraw's "god object". You can use the app to do
// just about everything that's possible in tldraw. Internally, the canvas
// component and all shapes, tools, and UI components use this instance to
// send events, observe changes, and perform actions.

export default function APIExample() {
	const handleMount = (editor: Editor) => {
		const url = 'https://storage.googleapis.com/wand-images-public/character.png'

		let file: File | undefined
		dataUrlToFile(url, 'test.png', 'image/png')
			.then((result) => {
				if (result instanceof File) {
					file = result
					const files = [file]
					editor
						.putExternalContent({
							type: 'files',
							files,
							point: editor.viewportPageCenter,
							ignoreParent: false,
						})
						.then((result) => {
							return result
						})
						.catch((error) => console.error('Unable to create shape from file, ', error))
				} else {
					console.error('Unable to get file from URL')
				}
			})
			.catch((error) => console.error(`Unable to get file from URL, ${url}, `, error))

		// Get the created shape
		const ids = editor.getShapeIdsInPage(editor.currentPageId)

		const imageShapes: TLImageShape[] = []
		ids.forEach((id) => {
			const shape = editor.getShapeById(id)
			if (shape && shape.type === 'image') {
				imageShapes.push(shape as TLImageShape)
			}
		})

		// Create a shape id

		editor.focus()

		// const imageShape = imageShapes[0]
		// const update: TLShapePartial<TLImageShape> = {
		// 	id: imageShape.id,
		// 	type: "image",
		// 	props: {
		// 		h : imageShape.props.h * 2,
		// 	}
		// }
		// shapeUpdates.push(update)

		// Update the shape
		// editor.updateShapes(shapeUpdates)
		// editor.updateShapes([shapeUpdate])

		// Select the shape
		// editor.select(id)

		// Rotate the shape around its center
		// editor.rotateShapesBy([id], Math.PI / 8)

		// Clear the selection
		editor.selectNone()

		// Zoom the camera to fit both shapes
		editor.zoomToFit()
	}

	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="api-example" onMount={handleMount} autoFocus={false}>
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

	// useEffect(() => {
	// 	let i = 0
	//
	// 	const interval = setInterval(() => {
	// 		const selection = [...editor.selectedIds]
	// 		editor.selectAll()
	// 		editor.setStyle(DefaultColorStyle, i % 2 ? 'blue' : 'light-blue')
	// 		editor.setSelectedIds(selection)
	// 		i++
	// 	}, 1000)
	//
	// 	return () => {
	// 		clearInterval(interval)
	// 	}
	// }, [editor])

	return null
}
