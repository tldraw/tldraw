import { DefaultActionsMenu, TLComponents, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

function CustomActionsMenu() {
	return (
		<div style={{ transform: 'rotate(90deg)' }}>
			<DefaultActionsMenu />
		</div>
	)
}

const components: TLComponents = {
	ActionsMenu: CustomActionsMenu,
}

export default function CustomActionsMenuExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}
