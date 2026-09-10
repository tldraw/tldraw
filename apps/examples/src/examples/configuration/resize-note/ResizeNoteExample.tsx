import { NoteShapeUtil, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

const shapeUtils = [NoteShapeUtil.configure({ resizeMode: 'scale' })]

export default function ResizeNoteExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="resize-note" shapeUtils={shapeUtils} />
		</div>
	)
}
