import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { CardShapeExtension } from './CardShapeExtension/CardShapeExtension'
import { uiOverrides } from './ui-overrides'

export default function ExtensionsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				autoFocus
				extensions={[CardShapeExtension]}
				// Pass in any overrides to the user interface
				// TODO: bundle this in with the extension?
				overrides={uiOverrides}
			/>
		</div>
	)
}
