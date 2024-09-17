import { createContext, useContext, useState } from 'react'
import { Editor, Tldraw, useValue } from 'tldraw'
import 'tldraw/tldraw.css'
import './external-ui.css'

// There's a guide at the bottom of this file!

// [1]
const editorContext = createContext({} as { editor: Editor })

export default function ExternalUiExample2() {
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
					<ExternalToolbar />
				</editorContext.Provider>
			)}
		</div>
	)
}

// [4]
const ExternalToolbar = () => {
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

[1] 
Use React context to store the editor at a higher place in the React component tree. 

[2] 
Use the `onMount` prop to get the editor instance and store it in state.

[3]
When we have an editor in state, render the context provider and its descendants.

[4]
You can access the editor from any of the provider's descendants.
*/
