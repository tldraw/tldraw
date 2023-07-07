import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { CardShapeTool } from './CardShape/CardShapeTool'
import { CardShapeUtil } from './CardShape/CardShapeUtil'
import { uiOverrides } from './ui-overrides'

const customShapes = [CardShapeUtil]
const customTools = [CardShapeTool]

export default function CustomConfigExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				autoFocus
				// Pass in the array of custom shape classes
				shapeUtils={customShapes}
				// Pass in the array of custom tool classes
				tools={customTools}
				// Pass in any overrides to the user interface
				overrides={uiOverrides}
			/>
		</div>
	)
}
