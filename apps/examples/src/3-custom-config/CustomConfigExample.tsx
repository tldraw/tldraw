import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { CardShapeTool } from './CardShape/CardShapeTool'
import { customShapes } from './custom-shapes'
import { uiOverrides } from './ui-overrides'

export default function CustomConfigExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				autoFocus
				// Pass in the array of custom shape definitions
				shapes={customShapes}
				// Pass in the array of custom tools
				tools={[CardShapeTool]}
				// Pass in any overrides to the user interface
				overrides={uiOverrides}
			/>
		</div>
	)
}
