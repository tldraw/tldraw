import { useEffect } from 'react'
import { Tldraw, track, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import './custom-ui.css'

// There's a guide at the bottom of this file!

// [1]
export default function CustomUiExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw hideUi>
				<CustomUi />
			</Tldraw>
		</div>
	)
}

// [2]
const CustomUi = track(() => {
	const editor = useEditor()

	useEffect(() => {
		const handleKeyUp = (e: KeyboardEvent) => {
			if (editor.getEditingShapeId() !== null) return
			const target = e.target as HTMLElement | null
			if (target?.isContentEditable) return
			if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return

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
	}, [editor])

	return (
		<div className="custom-layout">
			<div className="custom-toolbar">
				<button
					className="custom-button"
					data-isactive={editor.getCurrentToolId() === 'select'}
					onClick={() => editor.setCurrentTool('select')}
				>
					Select
				</button>
				<button
					className="custom-button"
					data-isactive={editor.getCurrentToolId() === 'draw'}
					onClick={() => editor.setCurrentTool('draw')}
				>
					Pencil
				</button>
				<button
					className="custom-button"
					data-isactive={editor.getCurrentToolId() === 'eraser'}
					onClick={() => editor.setCurrentTool('eraser')}
				>
					Eraser
				</button>
			</div>
		</div>
	)
})

/*
[1]
We render the `Tldraw` component with the `hideUi` prop, which hides the default toolbar, style
panel, menus, and so on. Our custom UI is rendered as a child of `Tldraw`, which gives it access to
the editor instance via React context.

The context menu isn't hidden by `hideUi`. If you want to hide it too, render the parts that make
up the `Tldraw` component separately and omit the context menu; see the exploded example.

[2]
The component is wrapped in `track()` so it re-renders when the signals it reads change; here
`editor.getCurrentToolId()` drives which button is active. See the signals example for more:
https://tldraw.dev/examples/signals

We get the editor via `useEditor` and add a window `keyup` listener for our own shortcuts. The
listener skips key presses while a shape is being edited or when an input has focus, so typing text
doesn't switch tools.
*/
