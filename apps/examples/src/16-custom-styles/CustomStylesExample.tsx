import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { CardShapeUtil } from './CardShape'
import { FilterStyleUi } from './FilterStyleUi'
import { uiOverrides } from './ui-overrides'

const shapeUtils = [CardShapeUtil]

export default function CustomStylesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				autoFocus
				persistenceKey="custom-styles-example"
				shapeUtils={shapeUtils}
				overrides={uiOverrides}
			>
				<FilterStyleUi />
			</Tldraw>
		</div>
	)
}
