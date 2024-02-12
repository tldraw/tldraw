import { TLComponents, Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

const components: TLComponents = {
	HelpMenu: null,
	HelpMenuContent: null,
	ContextMenu: null,
	ContextMenuContent: null,
	MainMenu: null,
	MainMenuContent: null,
	ActionsMenu: null,
	ActionsMenuContent: null,
	ZoomMenu: null,
	ZoomMenuContent: null,
	PageMenu: null,
	Minimap: null,
	NavigationPanel: null,
	// setting either Style Panel or Style Panel Content to null will hide the panel
	StylePanel: null,
	StylePanelContent: null,
}

export default function UiComponentsHiddenExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}
