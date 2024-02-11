import { DefaultZoomMenu, TLUiComponents, Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

function CustomZoomMenu() {
	return (
		<div style={{ transform: 'rotate(180deg)', position: 'relative' }}>
			<DefaultZoomMenu />
		</div>
	)
}

const uiComponents: TLUiComponents = {
	ZoomMenu: CustomZoomMenu,
}

export default function CustomZoomMenuExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw uiComponents={uiComponents} />
		</div>
	)
}
