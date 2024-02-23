import { Editor, Tldraw, useValue } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { createContext, useContext, useState } from 'react'
import './external-ui.css'

// There's a guide at the bottom of this file!

// [1]
const editorContext = createContext({} as { editor: Editor })

export default function ExternalUiExample() {
	const [editor, setEditor] = useState<Editor | null>(null)

	return (
		<div style={{ margin: 32, width: 600 }}>
			<div style={{ height: 400 }}>
				<Tldraw
					// [2]
					onMount={(editor) => setEditor(editor)}
					components={{ Toolbar: null }}
				/>
			</div>
			{/* [3] */}
			{editor && (
				<editorContext.Provider value={{ editor }}>
					<button onClick={() => editor.zoomToFit()}>Zoom to fit</button>
					<ExternalToolbar />
				</editorContext.Provider>
			)}
		</div>
	)
}

const ExternalToolbar = () => {
	// [6]
	const { editor } = useContext(editorContext)

	const currentToolId = useValue('current tool id', () => editor?.getCurrentToolId(), [editor])

	return (
		<div>
			<div className="external-toolbar">
				<button
					className="external-button"
					data-isactive={currentToolId === 'select'}
					onClick={() => editor.setCurrentTool('select')}
				>
					Select
				</button>
				<button
					className="external-button"
					data-isactive={currentToolId === 'draw'}
					onClick={() => editor.setCurrentTool('draw')}
				>
					Pencil
				</button>
			</div>
		</div>
	)
}

/*

This example shows how to control the tldraw editor from an external UI, outside
of the `Tldraw` component. There are a few ways of doing this—for example, by putting
the editor on the window object, passing it around via props, or using React context.
In this example, we'll use React context.

[1] 
Use React context to store the editor at a higher place in the React component tree. 

[2] 
Use the `onMount` prop to get the editor instance and store it in state.

[3]
When we have an editor in state, we pass it down to the context provider.

[4]
You can access the editor from anywhere now.

[5]
In all descendants of the context provider, we can use React's `useContext` hook to get
the editor instance that we have stored up in state.
*/
