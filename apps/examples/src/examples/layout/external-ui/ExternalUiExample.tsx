import { useState } from 'react'
import { Editor, GeoShapeGeoStyle, Tldraw, useValue } from 'tldraw'
import 'tldraw/tldraw.css'
import './external-ui.css'

// There's a guide at the bottom of this file!

export default function ExternalUiExample() {
	// [1]
	const [editor, setEditor] = useState<Editor | null>(null)

	const currentToolId = useValue('current tool id', () => editor?.getCurrentToolId(), [editor])

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
			<div>
				<div className="external-toolbar">
					<button
						className="external-button"
						data-isactive={currentToolId === 'select'}
						onClick={() => editor?.setCurrentTool('select')}
					>
						Select
					</button>
					<button
						className="external-button"
						data-isactive={currentToolId === 'draw'}
						onClick={() => editor?.setCurrentTool('draw')}
					>
						Pencil
					</button>
					<button
						className="external-button"
						data-isactive={
							currentToolId === 'geo' && editor?.getStyleForNextShape(GeoShapeGeoStyle) === 'oval'
						}
						onClick={() => {
							if (!editor) return
							editor.run(() => {
								// [4]
								editor.setStyleForNextShapes(GeoShapeGeoStyle, 'oval')
								editor.setCurrentTool('geo')
							})
						}}
					>
						Oval
					</button>
				</div>
			</div>
		</div>
	)
}

/*
[1]
Components outside `Tldraw` can't use `useEditor()`, so we hold the editor in React
state instead. It's null until the editor mounts.

[2]
Use the `onMount` prop to get the editor instance and store it in state.

[3]
Read from the editor with `useValue` (so the active button updates when the tool
changes) and call its methods to control it. The callbacks guard against the editor
not being mounted yet.

[4]
The geo tool creates whichever geo shape is set in `GeoShapeGeoStyle` (oval,
rectangle, etc), so set the style first, then switch tools. `editor.run` batches the
two updates together.
*/
