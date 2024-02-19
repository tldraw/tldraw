import { Editor, Tldraw, track } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useEffect, useState } from 'react'
import './external-ui.css'

// There's a guide at the bottom of this file!

export default function ExternalUiExample() {
	const [editor, setEditor] = useState<Editor>()

	return (
		<div style={{ margin: 32, width: 600 }}>
			<div style={{ height: 400 }}>
				<Tldraw
					// [1]
					onMount={(editor) => setEditor(editor)}
					components={{ Toolbar: null }}
				/>
			</div>

			<ExternalToolbar
				// [2]
				editor={editor}
			/>
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

/*

This example shows how to control the tldraw editor from an external UI, outside
of the `Tldraw` component.

[1]
Store the editor in some state when the `Tldraw` component mounts.

[2] Pass the editor to your external UI component. In this example, we're using
the same component as in the `custom-ui` example, but you could use any UI you
want. Check out that example for more info on how , including how to make the UI
reactive.

This example passes the editor down as a prop, but you could also use a context.

Check out the `custom-ui` example for more information on how to create custom
UI components for the editor, including how to make them reactive.

*/
