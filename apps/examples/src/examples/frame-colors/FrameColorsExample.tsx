import { FrameShapeUtil, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

const ConfiguredFrameShapeUtil = FrameShapeUtil.configure({ showColors: true })

export default function FrameColorsExample() {
	return (
		<>
			<div className="tldraw__editor">
				<Tldraw persistenceKey="example" shapeUtils={[ConfiguredFrameShapeUtil]}></Tldraw>
			</div>
		</>
	)
}
