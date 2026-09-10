import { FrameShapeUtil, NoteShapeUtil, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

const shapeUtils = [
	FrameShapeUtil.configure({ showColors: true }),
	NoteShapeUtil.configure({ resizeMode: 'scale' }),
]

export default function ConfigureShapeUtilExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw shapeUtils={shapeUtils} />
		</div>
	)
}
