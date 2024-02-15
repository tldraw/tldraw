import { Editor, TLComponents, Tldraw, track } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { createContext, useContext, useEffect, useState } from 'react'
import './external-ui.css'

const components: TLComponents = {
	Toolbar: null,
}

export default function CustomUiExample() {
	const [editor, setEditor] = useState<Editor | undefined>(undefined)

	const handleMount = (editor: Editor) => {
		setEditor(editor)
		editor.updateInstanceState({ isDebugMode: false })
	}

	return (
		<div style={{ margin: 32, width: 600 }}>
			<div style={{ height: 400 }}>
				<Tldraw onMount={handleMount} components={components} />
			</div>

			<MyEditorContext.Provider value={editor}>
				<ExternalToolbar />
			</MyEditorContext.Provider>
		</div>
	)
}

const MyEditorContext = createContext<Editor | undefined>(undefined)

function useMyEditor() {
	const editor = useContext(MyEditorContext)
	if (editor === null) throw new Error('useMyEditor must be used within a MyEditorContext.Provider')
	return editor
}

const ExternalToolbar = track(() => {
	const editor = useMyEditor()

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

	if (!editor) return null

	return (
		<div>
			<div className="external-toolbar">
				<button
					className="external-button"
					data-isactive={editor.getCurrentToolId() === 'select'}
					onClick={() => editor.setCurrentTool('select')}
				>
					Select
				</button>
				<button
					className="external-button"
					data-isactive={editor.getCurrentToolId() === 'draw'}
					onClick={() => editor.setCurrentTool('draw')}
				>
					Pencil
				</button>
				<button
					className="external-button"
					data-isactive={editor.getCurrentToolId() === 'eraser'}
					onClick={() => editor.setCurrentTool('eraser')}
				>
					Eraser
				</button>
			</div>
		</div>
	)
})
