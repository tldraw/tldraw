import { useEffect, useState } from 'react'
import { Editor, TLComponents, Tldraw, TLShape } from 'tldraw'

function TldrawViewer({
	shapes,
	components = {},
}: {
	shapes: TLShape[]
	components?: TLComponents
}) {
	const [editor, setEditor] = useState<Editor | null>(null)

	useEffect(() => {
		if (!editor) return
		editor.updateInstanceState({ isReadonly: false })
		editor.setCameraOptions({ isLocked: false })
		editor.deleteShapes(editor.getCurrentPageShapes())
		editor.createShapes(shapes)
		editor.updateInstanceState({ isReadonly: true })
		editor.selectAll()
		const bounds = editor.getSelectionPageBounds()
		if (bounds) {
			editor.zoomToBounds(bounds, { inset: 20 })
		}
		editor.selectNone()
		editor.setCameraOptions({ isLocked: true })
	}, [shapes, editor])

	return (
		<div className="tldraw-viewer">
			<Tldraw hideUi components={components ?? {}} inferDarkMode={false} onMount={setEditor} />
		</div>
	)
}

export default TldrawViewer
