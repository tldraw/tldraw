import { Tldraw } from '@tldraw/tldraw'
import { MyshapeTool } from './my-shape/my-shape-tool'
import { MyshapeUtil } from './my-shape/my-shape-util'
import { components, uiOverrides } from './ui-overrides'

const customShapes = [MyshapeUtil]
const customTools = [MyshapeTool]

export default function CustomSnappingShapeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={customShapes}
				tools={customTools}
				overrides={uiOverrides}
				components={components}
				persistenceKey="custom-snapping-shape-example"
			/>
		</div>
	)
}
