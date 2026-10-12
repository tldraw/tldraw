import { Tldraw, TldrawUiButton, TldrawUiButtonLabel, TLUiComponents, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'

function ExportCanvasButton() {
	const editor = useEditor()
	return (
		<div className="tlui-menu" style={{ pointerEvents: 'all' }}>
			<TldrawUiButton
				type="normal"
				onClick={async () => {
					const shapeIds = editor.getCurrentPageShapeIds()
					if (shapeIds.size === 0) return alert('No shapes on the canvas')
					// [1]
					const { blob } = await editor.toImage([...shapeIds], { format: 'png', background: false })

					// [2]
					const link = document.createElement('a')
					link.href = URL.createObjectURL(blob)
					link.download = 'every-shape-on-the-canvas.png'
					link.click()
					URL.revokeObjectURL(link.href)
				}}
			>
				<TldrawUiButtonLabel>Export canvas as image</TldrawUiButtonLabel>
			</TldrawUiButton>
		</div>
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
[1]
`editor.toImage` renders the given shapes to a `Blob`. Passing every shape id on the
page exports the whole canvas; pass a subset (e.g. `editor.getSelectedShapeIds()`) to
export part of it. `format` can be 'png', 'jpeg', 'webp', or 'svg'.

[2]
The simplest way to download a blob in the browser is a temporary link with a
`download` attribute. Revoke the object URL afterwards to free the memory.

See the "Export canvas as image (with settings)" example for the other export options,
and the "Create an image shape" / "Hosted images" examples for handling assets.
*/
