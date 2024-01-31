import { Tldraw, Vec, useContainer, useEditor } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useEffect } from 'react'

export default function FloatyExample() {
	return (
		<Tldraw persistenceKey="tldraw_floaty_example" style={{ width: '100%', height: '100%' }}>
			<SneakyFloatyHook />
		</Tldraw>
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
