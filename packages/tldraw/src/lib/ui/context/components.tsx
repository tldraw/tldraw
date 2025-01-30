import { useShallowObjectIdentity } from '@tldraw/editor'
import { ComponentType, ReactNode, createContext, useContext, useMemo } from 'react'
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
import { DefaultLayout } from '../components/DefaultLayout'
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
import {
	DefaultBottomCenterPanel,
	DefaultBottomLeftPanel,
	DefaultBottomRightPanel,
	DefaultTopCenterPanel,
	DefaultTopLeftPanel,
	DefaultTopRightPanel,
} from '../components/TldrawUiLayout/defaultPanels'
import { DefaultToasts } from '../components/Toasts'
import { DefaultToolbar } from '../components/Toolbar/DefaultToolbar'
import { DefaultZoomMenu, TLUiZoomMenuProps } from '../components/ZoomMenu/DefaultZoomMenu'
import { useShowCollaborationUi } from '../hooks/useIsMultiplayer'

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
	KeyboardShortcutsDialog?: ComponentType<TLUiKeyboardShortcutsDialogProps> | null
	QuickActions?: ComponentType<TLUiQuickActionsProps> | null
	HelperButtons?: ComponentType<TLUiHelperButtonsProps> | null
	DebugPanel?: ComponentType | null
	DebugMenu?: ComponentType | null
	MenuPanel?: ComponentType | null
	SharePanel?: ComponentType | null
	CursorChatBubble?: ComponentType | null
	Dialogs?: ComponentType | null
	Toasts?: ComponentType | null
	Layout?: ComponentType | null
	/** @deprecated use TopCenterPanel instead. */
	TopPanel?: ComponentType | null
	TopLeftPanel?: ComponentType | null
	TopCenterPanel?: ComponentType | null
	TopRightPanel?: ComponentType | null
	CenterLeftPanel?: ComponentType | null
	CenterRightPanel?: ComponentType | null
	BottomCenterPanel?: ComponentType | null
	BottomLeftPanel?: ComponentType | null
	BottomRightPanel?: ComponentType | null
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
					KeyboardShortcutsDialog: DefaultKeyboardShortcutsDialog,
					QuickActions: DefaultQuickActions,
					HelperButtons: DefaultHelperButtons,
					DebugPanel: DefaultDebugPanel,
					DebugMenu: DefaultDebugMenu,
					MenuPanel: DefaultMenuPanel,
					SharePanel: showCollaborationUi ? DefaultSharePanel : null,
					CursorChatBubble: showCollaborationUi ? CursorChatBubble : null,
					TopLeftPanel: DefaultTopLeftPanel,
					TopCenterPanel: showCollaborationUi ? DefaultTopCenterPanel : null,
					TopRightPanel: DefaultTopRightPanel,
					CenterLeftPanel: null,
					CenterRightPanel: null,
					BottomCenterPanel: DefaultBottomCenterPanel,
					BottomLeftPanel: DefaultBottomLeftPanel,
					BottomRightPanel: DefaultBottomRightPanel,
					Dialogs: DefaultDialogs,
					Toasts: DefaultToasts,
					Layout: DefaultLayout,
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
