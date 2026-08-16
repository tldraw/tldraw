import { FrameShapeUtil, NoteShapeUtil, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

const shapeUtils = [
	// Show colored fills and headings on frames
	FrameShapeUtil.configure({ showColors: true }),

	// Let notes be resized by scaling
	NoteShapeUtil.configure({ resizeMode: 'scale' }),
]

export default function ConfigureShapeUtilExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw shapeUtils={shapeUtils} />
		</div>
	)
}
