import { NoteShapeUtil, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// The note shape util has a static `options` object.
// Important! This example will effect other examples, too.
// If you're running examples locally, reload after leaving this page!
NoteShapeUtil.options.resizeMode = 'scale'

export default function ResizeNoteExample() {
	return (
		<>
			<div className="tldraw__editor">
				<Tldraw persistenceKey="resize-note"></Tldraw>
			</div>
		</>
	)
}
