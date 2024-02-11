import { TLUiComponents, Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

const uiComponents: TLUiComponents = {
	HelpMenuContent: null,
	ContextMenuContent: null,
	MainMenuContent: null,
	ActionsMenuContent: null,
	ZoomMenuContent: null,
	Minimap: null,
	PageMenu: null,
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
