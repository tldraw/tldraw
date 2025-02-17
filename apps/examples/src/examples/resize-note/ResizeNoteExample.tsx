import { NoteShapeUtil, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// Configure the note shape util to allow scaling to resize
const shapeUtils = [NoteShapeUtil.configure({ resizeMode: 'scale' })]

export default function ResizeNoteExample() {
	return (
		<>
			<div className="tldraw__editor">
				{/* pass the configured shape utils to the editor */}
				<Tldraw persistenceKey="resize-note" shapeUtils={shapeUtils}></Tldraw>
			</div>
		</>
	)
}
