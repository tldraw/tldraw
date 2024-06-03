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
import { DefaultDebugMenu } from '../components/DebugMenu/DefaultDebugMenu'
import { DefaultDebugPanel } from '../components/DefaultDebugPanel'
import { DefaultHelpMenu, TLUiHelpMenuProps } from '../components/HelpMenu/DefaultHelpMenu'
import {
	DefaultHelperButtons,
	TLUiHelperButtonsProps,
} from '../components/HelperButtons/DefaultHelperButtons'
import {
	DefaultKeyboardShortcutsDialog,
	TLUiKeyboardShortcutsDialogProps,
} from '../components/KeyboardShortcutsDialog/DefaultKeyboardShortcutsDialog'
import { DefaultMainMenu, TLUiMainMenuProps } from '../components/MainMenu/DefaultMainMenu'
import { DefaultMenuPanel } from '../components/MenuPanel'
import { DefaultMinimap } from '../components/Minimap/DefaultMinimap'
import { DefaultNavigationPanel } from '../components/NavigationPanel/DefaultNavigationPanel'
import { DefaultPageMenu } from '../components/PageMenu/DefaultPageMenu'
import {
	DefaultQuickActions,
	TLUiQuickActionsProps,
} from '../components/QuickActions/DefaultQuickActions'
import { DefaultStylePanel, TLUiStylePanelProps } from '../components/StylePanel/DefaultStylePanel'
import { DefaultToolbar } from '../components/Toolbar/DefaultToolbar'
import { DefaultZoomMenu, TLUiZoomMenuProps } from '../components/ZoomMenu/DefaultZoomMenu'

export interface BaseTLUiComponents {
	ContextMenu: ComponentType<TLUiContextMenuProps>
	ActionsMenu: ComponentType<TLUiActionsMenuProps>
	HelpMenu: ComponentType<TLUiHelpMenuProps>
	ZoomMenu: ComponentType<TLUiZoomMenuProps>
	MainMenu: ComponentType<TLUiMainMenuProps>
	Minimap: ComponentType
	StylePanel: ComponentType<TLUiStylePanelProps>
	PageMenu: ComponentType
	NavigationPanel: ComponentType
	Toolbar: ComponentType
	KeyboardShortcutsDialog: ComponentType<TLUiKeyboardShortcutsDialogProps>
	QuickActions: ComponentType<TLUiQuickActionsProps>
	HelperButtons: ComponentType<TLUiHelperButtonsProps>
	DebugPanel: ComponentType
	DebugMenu: ComponentType
	MenuPanel: ComponentType
	TopPanel: ComponentType
	SharePanel: ComponentType
}

/** @public */
export type TLUiComponents = Partial<{
	[K in keyof BaseTLUiComponents]: BaseTLUiComponents[K] | null
}>

const TldrawUiComponentsContext = createContext<TLUiComponents | null>(null)

/** @public */
export interface TLUiComponentsProviderProps {
	overrides?: TLUiComponents
	children: ReactNode
}

/** @public */
export function TldrawUiComponentsProvider({
	overrides = {},
	children,
}: TLUiComponentsProviderProps) {
	const _overrides = useShallowObjectIdentity(overrides)

	return (
		<TldrawUiComponentsContext.Provider
			value={useMemo(
				() => ({
					ContextMenu: DefaultContextMenu,
					ActionsMenu: DefaultActionsMenu,
					HelpMenu: DefaultHelpMenu,
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
					..._overrides,
				}),
				[_overrides]
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
