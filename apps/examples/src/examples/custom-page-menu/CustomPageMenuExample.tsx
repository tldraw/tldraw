import { TLUiComponents, Tldraw } from '@tldraw/tldraw'
import { DefaultPageMenu } from '@tldraw/tldraw/src/lib/ui/components/PageMenu/PageMenu'
import '@tldraw/tldraw/tldraw.css'

function CustomPageMenu() {
	return (
		<div style={{ transform: 'rotate(3.14rad)' }}>
			<DefaultPageMenu />
		</div>
	)
}

const uiComponents: TLUiComponents = {
	PageMenu: CustomPageMenu, // null will hide the page menu instead
}

export default function CustomPageMenuExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw uiComponents={uiComponents} />
		</div>
	)
}
