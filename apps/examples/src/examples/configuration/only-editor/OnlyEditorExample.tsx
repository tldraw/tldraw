import { TldrawEditor, createShapeId } from 'tldraw'
import 'tldraw/tldraw.css'
import { MiniBoxShapeUtil } from './MiniBoxShape'
import { MiniSelectTool } from './MiniSelectTool'

// There's a guide at the bottom of this file!

// [1]
const tools = [MiniSelectTool]
const shapeUtils = [MiniBoxShapeUtil]

function Instructions() {
	return (
		<div style={{ position: 'absolute', transform: 'translate(16px, 16px)', width: 320 }}>
			<p>Double click to create or delete shapes.</p>
			<p>Click or shift+click to select shapes.</p>
			<p>Click and drag to move shapes.</p>
		</div>
	)
}

const components = {
	OnTheCanvas: Instructions,
}

// [2]
export default function OnlyEditorExample() {
	return (
		<div className="tldraw__editor">
			<TldrawEditor
				tools={tools}
				shapeUtils={shapeUtils}
				components={components}
				initialState="select"
				onMount={(editor) => {
					editor
						.selectAll()
						.deleteShapes(editor.getSelectedShapeIds())
						.createShapes([{ id: createShapeId(), type: 'box', x: 100, y: 100 }])
				}}
			/>
		</div>
	)
}

/*
[1]
TldrawEditor has no built-in shapes or tools, so we supply our own: a box shape util
(MiniBoxShape.tsx) and a select tool (MiniSelectTool.ts). MicroSelectTool.ts is an even smaller
select tool without child states; it isn't wired up here but is worth reading first. The custom
config example covers writing shapes and tools in more depth.

[2]
`initialState` names the tool the editor starts in; it must match a tool's `static id`. There is
no UI here, so the instructions are rendered through the `OnTheCanvas` component slot instead.
*/
