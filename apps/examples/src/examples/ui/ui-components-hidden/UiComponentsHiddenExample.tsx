import { TLUiComponents, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// [1]
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
	DebugPanel: null,
	DebugMenu: null,
	SharePanel: null,
	MenuPanel: null,
	TopPanel: null,
	CursorChatBubble: null,
	RichTextToolbar: null,
	ImageToolbar: null,
	VideoToolbar: null,
	Dialogs: null,
	Toasts: null,
	A11y: null,
	FollowingIndicator: null,
	PeopleMenu: null,
	PeopleMenuAvatar: null,
	PeopleMenuItem: null,
	PeopleMenuFacePile: null,
	UserPresenceEditor: null,
}

export default function UiComponentsHiddenExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}

/*
[1]
Setting a slot to `null` removes that part of the UI. Set only the slots you
want to hide; the `Required<>` type is here so this example lists every slot,
which is handy as a reference. Hiding `Toasts`, `Dialogs`, or `A11y`
also disables the features that render through them (toast notifications,
dialogs like the keyboard shortcuts panel, and screen reader announcements). To
hide everything at once, use the `hideUi` prop instead.
*/
