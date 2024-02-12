import { DefaultMainMenu, TLComponents, Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

function CustomMainMenu() {
	return (
		<div style={{ transform: 'rotate(90deg)' }}>
			<DefaultMainMenu />
		</div>
	)
}

const components: TLComponents = {
	MainMenu: CustomMainMenu,
}

export default function CustomMainMenuExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}
