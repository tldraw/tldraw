import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function ResizeNoteExample() {
	return (
		<>
			<div className="tldraw__editor">
				<Tldraw persistenceKey="resize-note" options={{ noteShapeResizeMode: 'scale' }}></Tldraw>
			</div>
		</>
	)
}
