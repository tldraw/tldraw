import { TLUiComponents, Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

const uiComponents: TLUiComponents = {
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
			<Tldraw uiComponents={uiComponents} />
		</div>
	)
}
