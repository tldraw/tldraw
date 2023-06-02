import { Canvas, TldrawEditor, useEditor } from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import { useEffect } from 'react'
import { track } from 'signia-react'
import './custom-ui.css'

export default function CustomUiExample() {
	return (
		<div className="tldraw__editor">
			<TldrawEditor autoFocus>
				<Canvas />
				<CustomUi />
			</TldrawEditor>
		</div>
	)
}

const CustomUi = track(() => {
	const app = useEditor()

	useEffect(() => {
		const handleKeyUp = (e: KeyboardEvent) => {
			switch (e.key) {
				case 'Delete':
				case 'Backspace': {
					app.deleteShapes()
				}
			}
		}

		window.addEventListener('keyup', handleKeyUp)
		return () => {
			window.removeEventListener('keyup', handleKeyUp)
		}
	})

	return (
		<div className="custom-layout">
			<div className="custom-toolbar">
				<button
					className="custom-button"
					data-isactive={app.currentToolId === 'select'}
					onClick={() => app.setSelectedTool('select')}
				>
					Select
				</button>
				<button
					className="custom-button"
					data-isactive={app.currentToolId === 'draw'}
					onClick={() => app.setSelectedTool('draw')}
				>
					Pencil
				</button>
				<button
					className="custom-button"
					data-isactive={app.currentToolId === 'eraser'}
					onClick={() => app.setSelectedTool('eraser')}
				>
					Eraser
				</button>
			</div>
		</div>
	)
})
