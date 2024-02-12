import { DefaultZoomMenu, TLComponents, Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

function CustomZoomMenu() {
	return (
		<div style={{ transform: 'rotate(180deg)', position: 'relative' }}>
			<DefaultZoomMenu />
		</div>
	)
}

const components: TLComponents = {
	ZoomMenu: CustomZoomMenu,
}

export default function CustomZoomMenuExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}
