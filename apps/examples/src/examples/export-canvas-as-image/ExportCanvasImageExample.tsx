import { Tldraw, TLUiComponents, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'

function ExportCanvasButton() {
	const editor = useEditor()
	return (
		<button
			style={{ pointerEvents: 'all', fontSize: 18, backgroundColor: 'thistle' }}
			onClick={async () => {
				const shapeIds = editor.getCurrentPageShapeIds()
				if (shapeIds.size === 0) return alert('No shapes on the canvas')
				const { blob } = await editor.toImage([...shapeIds], { format: 'png', background: false })

				const link = document.createElement('a')
				link.href = URL.createObjectURL(blob)
				link.download = 'every-shape-on-the-canvas.jpg'
				link.click()
				URL.revokeObjectURL(link.href)
			}}
		>
			Export canvas as image
		</button>
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
This example shows how you can use the `Editor.toImage()` function to create an image with all the shapes 
on the canvas in it and then download it. The easiest way to download an image is to use the download 
attribute of a link element.

To learn more about overriding UI you can check out our various custom menu examples. For more on handling
assets, check out our Local/Hosted images examples.
*/
