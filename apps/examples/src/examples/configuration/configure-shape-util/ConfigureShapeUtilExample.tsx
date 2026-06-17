import { FrameShapeUtil, NoteShapeUtil, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

const shapeUtils = [
	// Enable colors for frame shapes
	FrameShapeUtil.configure({ showColors: true }),

	// Enable resizing for note shapes, and hide the author attribution badge
	NoteShapeUtil.configure({ resizeMode: 'scale', showAttribution: false }),
]

export default function ConfigureShapeUtilExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw shapeUtils={shapeUtils}></Tldraw>
		</div>
	)
}
