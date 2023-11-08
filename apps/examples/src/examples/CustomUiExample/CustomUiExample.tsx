import { Canvas, Editor, Tldraw, track } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useEffect, useState } from 'react'
import './custom-ui.css'

export default function CustomUiExample() {
	const [editor, setEditor] = useState<Editor | null>(null)
	return (
		<div className="tldraw__editor" style={{ display: 'flex', flexDirection: 'column' }}>
			{editor && <CustomUi editor={editor} />}
			<Tldraw hideUi onMount={(editor) => setEditor(editor)}>
				<Canvas />
			</Tldraw>
		</div>
	)
}

const CustomUi = track(function CustomUi({ editor }) {
	useEffect(() => {
		const handleKeyUp = (e: KeyboardEvent) => {
			switch (e.key) {
				case 'Delete':
				case 'Backspace': {
					editor.deleteShapes(editor.selectedShapeIds)
					break
				}
				case 'v': {
					editor.setCurrentTool('select')
					break
				}
				case 'e': {
					editor.setCurrentTool('eraser')
					break
				}
				case 'x':
				case 'p':
				case 'b':
				case 'd': {
					editor.setCurrentTool('draw')
					break
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
					data-isactive={editor.currentToolId === 'select'}
					onClick={() => editor.setCurrentTool('select')}
				>
					Select
				</button>
				<button
					className="custom-button"
					data-isactive={editor.currentToolId === 'draw'}
					onClick={() => editor.setCurrentTool('draw')}
				>
					Pencil
				</button>
				<button
					className="custom-button"
					data-isactive={editor.currentToolId === 'eraser'}
					onClick={() => editor.setCurrentTool('eraser')}
				>
					Eraser
				</button>
			</div>
		</div>
	)
})
