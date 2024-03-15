import { TLComponents, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

function CustomNavigationPanel() {
	return <div style={{ backgroundColor: 'thistle', padding: '14px' }}>here you are</div>
}

const components: TLComponents = {
	NavigationPanel: CustomNavigationPanel, // null will hide the panel instead
}

export default function CustomNagiationPanelExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}
