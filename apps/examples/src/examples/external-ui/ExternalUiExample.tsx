import { Editor, Tldraw, track } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useEffect, useState } from 'react'
import './external-ui.css'

export default function ExternalUiExample() {
	const [editor, setEditor] = useState<Editor>()

	return (
		<div style={{ margin: 32, width: 600 }}>
			<div style={{ height: 400 }}>
				<Tldraw
					onMount={(editor) => {
						setEditor(editor)
					}}
					components={{
						Toolbar: null,
					}}
				/>
			</div>

			<ExternalToolbar editor={editor} />
		</div>
	)
}

const ExternalToolbar = track(({ editor }: { editor?: Editor }) => {
	useEffect(() => {
		const handleKeyUp = (e: KeyboardEvent) => {
			if (!editor) return
			switch (e.key) {
				case 'Delete':
				case 'Backspace': {
					editor.deleteShapes(editor.getSelectedShapeIds())
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
		<div>
			<div className="external-toolbar">
				<button
					className="external-button"
					data-isactive={editor ? editor.getCurrentToolId() === 'select' : true}
					onClick={() => editor?.setCurrentTool('select')}
				>
					Select
				</button>
				<button
					className="external-button"
					data-isactive={editor?.getCurrentToolId() === 'draw'}
					onClick={() => editor?.setCurrentTool('draw')}
				>
					Pencil
				</button>
				<button
					className="external-button"
					data-isactive={editor?.getCurrentToolId() === 'eraser'}
					onClick={() => editor?.setCurrentTool('eraser')}
				>
					Eraser
				</button>
			</div>
		</div>
	)
})
