import { TLUiComponents, Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

function CustomNavigationPanel() {
	return <div className="tlui-navigation-panel">here you are</div>
}

const uiComponents: TLUiComponents = {
	NavigationPanel: CustomNavigationPanel, // null will hide the panel instead
}

export default function CustomNagiationPanelExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw uiComponents={uiComponents} />
		</div>
	)
}
