import { FrameShapeUtil, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

const shapeUtils = [FrameShapeUtil.configure({ showColors: true })]

export default function ConfigureShapeUtilExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw shapeUtils={shapeUtils}></Tldraw>
		</div>
	)
}
