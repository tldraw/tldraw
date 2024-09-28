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
Use React state to store the editor instance.

[2]
Use the `onMount` prop to get the editor instance and store it in state.

[3]
Use data from the editor instance or use the editor's methods to control the editor.
Note that these callbacks also need to work if the editor isn't mounted yet.

[4]
The geo tool is a bit special since it controls the creation of many geo shapes (oval, rectangle, etc).
This is why we first set the type of the shape we wish to add, then we set the tool to 'geo'.
You can see all the available geo shapes in the `GeoShapeGeoStyle` enum.
*/
