import { createContext, useContext, useState } from 'react'
import { Editor, GeoShapeGeoStyle, Tldraw, useValue } from 'tldraw'
import 'tldraw/tldraw.css'
import './external-ui.css'

// There's a guide at the bottom of this file!

// [1]
const editorContext = createContext({} as { editor: Editor })

export default function ExternalUiContextExample() {
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

	const currentToolId = useValue('current tool id', () => editor.getCurrentToolId(), [editor])

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
				<button
					className="external-button"
					data-isactive={
						currentToolId === 'geo' && editor.getStyleForNextShape(GeoShapeGeoStyle) === 'oval'
					}
					onClick={() => {
						// [5]
						editor.run(() => {
							editor.setStyleForNextShapes(GeoShapeGeoStyle, 'oval')
							editor.setCurrentTool('geo')
						})
					}}
				>
					Oval
				</button>
			</div>
		</div>
	)
}

/*

[1]
A React context for the editor. Components outside `Tldraw` can't use `useEditor()`,
so we provide our own.

[2]
Use the `onMount` prop to get the editor instance and store it in state.

[3]
Only render the provider (and its descendants) once the editor exists, so consumers
never see a null editor.

[4]
Any descendant of the provider can read the editor from context. `useValue` keeps
the active button in sync with the current tool.

[5]
The geo tool creates whichever geo shape is set in `GeoShapeGeoStyle`, so set the
style first, then switch tools. `editor.run` batches the two updates together.
*/
