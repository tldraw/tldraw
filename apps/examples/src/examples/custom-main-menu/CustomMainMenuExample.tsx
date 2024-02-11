import { DefaultMainMenu, TLUiComponents, Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

function CustomMainMenu() {
	return (
		<div style={{ transform: 'rotate(90deg)' }}>
			<DefaultMainMenu />
		</div>
	)
}

const uiComponents: TLUiComponents = {
	MainMenu: CustomMainMenu,
}

export default function CustomMainMenuExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw uiComponents={uiComponents} />
		</div>
	)
}
