import { DefaultPageMenu, TLComponents, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

function CustomPageMenu() {
	return (
		<div style={{ transform: 'rotate(3.14rad)', backgroundColor: 'thistle' }}>
			<DefaultPageMenu />
		</div>
	)
}

const components: TLComponents = {
	PageMenu: CustomPageMenu, // null will hide the page menu instead
}

export default function CustomPageMenuExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}
