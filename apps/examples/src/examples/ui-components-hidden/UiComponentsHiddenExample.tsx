import { TLUiComponents, Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

// The type here is include only to ensure this example contains all possible ui components,
const components: Required<TLUiComponents> = {
	ContextMenu: null,
	ActionsMenu: null,
	HelpMenu: null,
	ZoomMenu: null,
	MainMenu: null,
	Minimap: null,
	StylePanel: null,
	PageMenu: null,
	NavigationPanel: null,
	Toolbar: null,
	KeyboardShortcutsDialog: null,
	QuickActions: null,
	HelperButtons: null,
}

export default function UiComponentsHiddenExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}
