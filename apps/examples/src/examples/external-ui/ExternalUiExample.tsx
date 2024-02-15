import { Editor, Tldraw, track } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useState } from 'react'

// There's a guide at the bottom of this file!

// [1]
export default function CustomUiExample() {
	const [editor, setEditor] = useState<Editor | null>(null)

	const handleMount = (editor: Editor) => {
		setEditor(editor)
	}

	return (
		<div>
			<CustomUi editor={editor} />
			<div style={{ width: 600, height: 400 }}>
				<Tldraw onMount={handleMount} />
			</div>
		</div>
	)
}

// [2]
const CustomUi = track(({ editor }: { editor: Editor | null }) => {
	return (
		<div>
			<div>
				<button
					data-isactive={editor?.getCurrentToolId() === 'select'}
					onClick={() => editor?.setCurrentTool('select')}
				>
					Select
				</button>
				<button
					data-isactive={editor?.getCurrentToolId() === 'draw'}
					onClick={() => editor?.setCurrentTool('draw')}
				>
					Pencil
				</button>
				<button
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
This example shows how to create your own custom ui for the editor.

[1]
We render the Tldraw component with the `hideUi` prop. This will hide the default
toolbar, style menu and pages menu. We also render our custom ui component inside the 
Tldraw component. This gives us access to the editor instance via React context.

The context menu isn't hidden by the `hideUi` prop, if you want to hide it you can
render the parts that make up the Tldraw component separately and omit the context
menu. Check out the exploded example to see how to do this.

[2]
We use the `track` function to wrap our component. This makes our component reactive- it will
re-render when the signals it is tracking change. Check out the signia docs for more: 
https://signia.tldraw.dev/docs/API/signia_react/functions/track

We gain access to the editor instance via the `useEditor` hook. We use the `useEffect` hook
to add event listeners for keyboard shortcuts. We use editor methods to change the current
tool and delete shapes.

*/
