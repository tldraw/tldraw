import { exportToBlob, Tldraw, TLUiComponents, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'

function ExportCanvasButton() {
	const editor = useEditor()
	return (
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
