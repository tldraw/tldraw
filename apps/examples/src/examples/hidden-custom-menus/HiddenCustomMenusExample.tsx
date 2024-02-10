import { CustomContextMenu, CustomHelpMenu, CustomZoomMenu, Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

export default function HiddenCustomMenusExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw>
				<CustomZoomMenu hidden />
				<CustomContextMenu hidden />
				<CustomHelpMenu hidden />
			</Tldraw>
		</div>
	)
}
