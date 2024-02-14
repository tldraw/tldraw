import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { MyShapeTool } from './my-shape/my-shape-tool'
import { MyShapeUtil } from './my-shape/my-shape-util'
import { uiOverrides } from './ui-overrides'

const customShapeUtils = [MyShapeUtil]
const customTools = [MyShapeTool]

export default function EditableShapeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				// Pass in the array of custom shape classes
				shapeUtils={customShapeUtils}
				tools={customTools}
				// Pass in any overrides to the user interface
				overrides={uiOverrides}
			/>
		</div>
	)
}
