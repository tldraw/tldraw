import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { CardShapeTool, CardShapeUtil } from './CardShape'
import { FilterStyleUi } from './FilterStyleUi'
import { uiOverrides } from './ui-overrides'

const customShapeUtils = [CardShapeUtil]
const customTools = [CardShapeTool]

export default function CustomStylesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="custom-styles-example"
				shapeUtils={customShapeUtils}
				tools={customTools}
				overrides={uiOverrides}
			>
				<FilterStyleUi />
			</Tldraw>
		</div>
	)
}
