import { useEffect } from 'react'
import { Tldraw, Vec, useContainer, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'

export default function FloatyExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="tldraw_floaty_example">
				<SneakyFloatyHook />
			</Tldraw>
		</div>
	)
}

function SneakyFloatyHook() {
	const editor = useEditor()
	const container = useContainer()

	useEffect(() => {
		if (!window.screenLeft) {
			window.screenLeft = window.screenX
			window.screenTop = window.screenY
		}

		let x = window.screenLeft ?? window.screenX
		let y = window.screenTop ?? window.screenY

		function updatePositions() {
			const sx = window.screenLeft ?? window.screenX
			const sy = window.screenTop ?? window.screenY

			if (sx !== x || sy !== y) {
				x = sx
				y = sy
				editor.setCamera(new Vec(-x, -y))
			}
		}

		editor.on('tick', updatePositions)

		return () => {
			editor.off('tick', updatePositions)
		}
	}, [editor, container])

	return null
}
