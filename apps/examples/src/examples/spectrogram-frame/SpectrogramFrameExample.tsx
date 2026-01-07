import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { SpectrogramFrameShapeUtil } from './SpectrogramFrameShapeUtil'
import { SpectrogramFrameTool } from './SpectrogramFrameTool'
import { components, uiOverrides } from './ui-overrides'

// Define shape utils and tools outside the component to prevent re-creation
const customShapeUtils = [SpectrogramFrameShapeUtil]
const customTools = [SpectrogramFrameTool]

export default function SpectrogramFrameExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={customShapeUtils}
				tools={customTools}
				overrides={uiOverrides}
				components={components}
			/>
		</div>
	)
}
