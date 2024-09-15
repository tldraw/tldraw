import { useState } from 'react'
import { exportToBlob, Tldraw, TLUiComponents, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'

function ExportCanvasButton() {
	const editor = useEditor()
	const [isOpen, setIsOpen] = useState(false)
	return (
		<>
			<button
				style={{ pointerEvents: 'all', fontSize: 18, backgroundColor: 'thistle' }}
				onClick={async () => {
					const shapeIds = editor.getCurrentPageShapeIds()
					if (shapeIds.size === 0) return alert('No shapes on the canvas')
					const blob = await exportToBlob({
						editor,
						ids: [...shapeIds],
						format: 'png',
						opts: { background: false },
					})

					const link = document.createElement('a')
					link.href = window.URL.createObjectURL(blob)
					link.download = 'every-shape-on-the-canvas.jpg'
					link.click()
				}}
			>
				Export canvas as image
			</button>
			<button
				onClick={() => {
					setIsOpen(!isOpen)
				}}
			>
				{isOpen ? 'close' : 'open'} export settings
			</button>
			{isOpen && (
				<div>
					<label htmlFor="background">background</label>
					<input type="checkbox" id="background" />
				</div>
			)}
		</>
	)
}
const components: TLUiComponents = {
	SharePanel: ExportCanvasButton,
}
export default function ExportCanvasImageExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}

/* 
This example shows how you can use the `exportToBlob()` function to create an image with all the shapes 
on the canvas in it and then download it. The easiest way to download an image is to use the download 
attribute of a link element.

To learn more about overriding UI you can check out our various custom menu examples. For more on handling
assets, check out our Local/Hosted images examples.
*/
