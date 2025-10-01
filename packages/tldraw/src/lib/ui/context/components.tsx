import { useShallowObjectIdentity } from '@tldraw/editor'
import { ComponentType, ReactNode, createContext, useContext, useMemo } from 'react'
import { DefaultA11yAnnouncer } from '../components/A11y'
import {
	DefaultActionsMenu,
	TLUiActionsMenuProps,
} from '../components/ActionsMenu/DefaultActionsMenu'
import {
	DefaultContextMenu,
	TLUiContextMenuProps,
} from '../components/ContextMenu/DefaultContextMenu'
import { CursorChatBubble } from '../components/CursorChatBubble'
import { DefaultDebugMenu } from '../components/DebugMenu/DefaultDebugMenu'
import { DefaultDebugPanel } from '../components/DefaultDebugPanel'
import { DefaultFollowingIndicator } from '../components/DefaultFollowingIndicator'
import { DefaultMenuPanel } from '../components/DefaultMenuPanel'
import { DefaultDialogs } from '../components/Dialogs'
import { TLUiHelpMenuProps } from '../components/HelpMenu/DefaultHelpMenu'
import {
	DefaultHelperButtons,
	TLUiHelperButtonsProps,
} from '../components/HelperButtons/DefaultHelperButtons'
import {
	DefaultKeyboardShortcutsDialog,
	TLUiKeyboardShortcutsDialogProps,
} from '../components/KeyboardShortcutsDialog/DefaultKeyboardShortcutsDialog'
import { DefaultMainMenu, TLUiMainMenuProps } from '../components/MainMenu/DefaultMainMenu'
import { DefaultMinimap } from '../components/Minimap/DefaultMinimap'
import { DefaultNavigationPanel } from '../components/NavigationPanel/DefaultNavigationPanel'
import { DefaultPageMenu } from '../components/PageMenu/DefaultPageMenu'
import {
	DefaultQuickActions,
	TLUiQuickActionsProps,
} from '../components/QuickActions/DefaultQuickActions'
import { DefaultSharePanel } from '../components/SharePanel/DefaultSharePanel'
import { DefaultStylePanel, TLUiStylePanelProps } from '../components/StylePanel/DefaultStylePanel'
import { DefaultToasts } from '../components/Toasts'
import { DefaultImageToolbar } from '../components/Toolbar/DefaultImageToolbar'
import {
	DefaultRichTextToolbar,
	TLUiRichTextToolbarProps,
} from '../components/Toolbar/DefaultRichTextToolbar'
import { DefaultToolbar } from '../components/Toolbar/DefaultToolbar'
import { DefaultVideoToolbar } from '../components/Toolbar/DefaultVideoToolbar'
import { DefaultTopPanel } from '../components/TopPanel/DefaultTopPanel'
import { DefaultZoomMenu, TLUiZoomMenuProps } from '../components/ZoomMenu/DefaultZoomMenu'
import { useShowCollaborationUi } from '../hooks/useCollaborationStatus'

/** @public */
export interface TLUiComponents {
	ContextMenu?: ComponentType<TLUiContextMenuProps> | null
	ActionsMenu?: ComponentType<TLUiActionsMenuProps> | null
	HelpMenu?: ComponentType<TLUiHelpMenuProps> | null
	ZoomMenu?: ComponentType<TLUiZoomMenuProps> | null
	MainMenu?: ComponentType<TLUiMainMenuProps> | null
	Minimap?: ComponentType | null
	StylePanel?: ComponentType<TLUiStylePanelProps> | null
	PageMenu?: ComponentType | null
	NavigationPanel?: ComponentType | null
	Toolbar?: ComponentType | null
	RichTextToolbar?: ComponentType<TLUiRichTextToolbarProps> | null
	ImageToolbar?: ComponentType | null
	VideoToolbar?: ComponentType | null
	KeyboardShortcutsDialog?: ComponentType<TLUiKeyboardShortcutsDialogProps> | null
	QuickActions?: ComponentType<TLUiQuickActionsProps> | null
	HelperButtons?: ComponentType<TLUiHelperButtonsProps> | null
	DebugPanel?: ComponentType | null
	DebugMenu?: ComponentType | null
	MenuPanel?: ComponentType | null
	TopPanel?: ComponentType | null
	SharePanel?: ComponentType | null
	CursorChatBubble?: ComponentType | null
	Dialogs?: ComponentType | null
	Toasts?: ComponentType | null
	A11y?: ComponentType | null
	FollowingIndicator?: ComponentType | null
}

const TldrawUiComponentsContext = createContext<TLUiComponents | null>(null)

/** @public */
export interface TLUiComponentsProviderProps {
	overrides?: TLUiComponents
	children: ReactNode
}

/** @public @react */
export function TldrawUiComponentsProvider({
	overrides = {},
	children,
}: TLUiComponentsProviderProps) {
	const _overrides = useShallowObjectIdentity(overrides)
	const showCollaborationUi = useShowCollaborationUi()

	return (
		<TldrawUiComponentsContext.Provider
			value={useMemo(
				() => ({
					ContextMenu: DefaultContextMenu,
					ActionsMenu: DefaultActionsMenu,
					HelpMenu: null,
					ZoomMenu: DefaultZoomMenu,
					MainMenu: DefaultMainMenu,
					Minimap: DefaultMinimap,
					StylePanel: DefaultStylePanel,
					PageMenu: DefaultPageMenu,
					NavigationPanel: DefaultNavigationPanel,
					Toolbar: DefaultToolbar,
					RichTextToolbar: DefaultRichTextToolbar,
					ImageToolbar: DefaultImageToolbar,
					VideoToolbar: DefaultVideoToolbar,
					KeyboardShortcutsDialog: DefaultKeyboardShortcutsDialog,
					QuickActions: DefaultQuickActions,
					HelperButtons: DefaultHelperButtons,
					DebugPanel: DefaultDebugPanel,
					DebugMenu: DefaultDebugMenu,
					MenuPanel: DefaultMenuPanel,
					SharePanel: showCollaborationUi ? DefaultSharePanel : null,
					CursorChatBubble: showCollaborationUi ? CursorChatBubble : null,
					TopPanel: showCollaborationUi ? DefaultTopPanel : null,
					Dialogs: DefaultDialogs,
					Toasts: DefaultToasts,
					A11y: DefaultA11yAnnouncer,
					FollowingIndicator: DefaultFollowingIndicator,
					..._overrides,
				}),
				[_overrides, showCollaborationUi]
			)}
		>
			{children}
		</TldrawUiComponentsContext.Provider>
	)
}

/** @public */
export function useTldrawUiComponents() {
	const components = useContext(TldrawUiComponentsContext)
	if (!components) {
		throw new Error('useTldrawUiComponents must be used within a TldrawUiComponentsProvider')
	}
	return components
}
