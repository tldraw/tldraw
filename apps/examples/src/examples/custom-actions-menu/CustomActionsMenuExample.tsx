import { DefaultActionsMenu, TLUiComponents, Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

function CustomActionsMenu() {
	return (
		<div style={{ transform: 'rotate(90deg)' }}>
			<DefaultActionsMenu />
		</div>
	)
}

const uiComponents: TLUiComponents = {
	ActionsMenu: CustomActionsMenu,
}

export default function CustomActionsMenuExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw uiComponents={uiComponents} />
		</div>
	)
}
