import { FrameShapeUtil, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

const shapeUtils = [FrameShapeUtil.configure({ showColors: true })]

export default function FrameColorsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="frame-colors" shapeUtils={shapeUtils} />
		</div>
	)
}
