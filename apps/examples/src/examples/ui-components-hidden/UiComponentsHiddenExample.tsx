import { TLUiComponents, Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

// The type here is include only to ensure this example contains all possible ui components,
const components: Required<TLUiComponents> = {
	ContextMenu: null,
	ContextMenuContent: null,
	ActionsMenu: null,
	ActionsMenuContent: null,
	HelpMenu: null,
	HelpMenuContent: null,
	ZoomMenu: null,
	ZoomMenuContent: null,
	MainMenu: null,
	MainMenuContent: null,
	Minimap: null,
	StylePanel: null,
	StylePanelContent: null,
	PageMenu: null,
	NavigationPanel: null,
	Toolbar: null,
	KeyboardShortcutsDialog: null,
	KeyboardShortcutsDialogContent: null,
	QuickActions: null,
	QuickActionsContent: null,
}

export default function UiComponentsHiddenExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}
