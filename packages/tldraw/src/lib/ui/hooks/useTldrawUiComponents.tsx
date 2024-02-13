import { ComponentType, createContext, useContext, useMemo } from 'react'
import {
	DefaultKeyboardShortcutsDialog,
	TLUiKeyboardShortcutsDialogProps,
} from '../components/KeyboardShortcutsDialog/DefaultKeyboardShortcutsDialog'
import { DefaultMinimap } from '../components/Minimap/DefaultMinimap'
import { DefaultNavigationPanel } from '../components/NavigationPanel/DefaultNavigationPanel'
import { DefaultPageMenu } from '../components/PageMenu/DefaultPageMenu'
import { DefaultStylePanel, TLUiStylePanelProps } from '../components/StylePanel/DefaultStylePanel'
import { DefaultToolbar } from '../components/Toolbar/DefaultToolbar'
import {
	DefaultActionsMenu,
	TLUiActionsMenuProps,
} from '../components/menus/ActionsMenu/DefaultActionsMenu'
import {
	DefaultContextMenu,
	TLUiContextMenuProps,
} from '../components/menus/ContextMenu/DefaultContextMenu'
import { DefaultHelpMenu, TLUiHelpMenuProps } from '../components/menus/HelpMenu/DefaultHelpMenu'
import { DefaultMainMenu, TLUiMainMenuProps } from '../components/menus/MainMenu/DefaultMainMenu'
import { DefaultQuickActions } from '../components/menus/QuickActions/DefaultQuickActions'
import { DefaultZoomMenu, TLUiZoomMenuProps } from '../components/menus/ZoomMenu/DefaultZoomMenu'

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
	QuickActions: ComponentType<TLUiContextMenuProps>
}

/** @public */
export type TLUiComponents = Partial<{
	[K in keyof BaseTLUiComponents]: BaseTLUiComponents[K] | null
}>

const TldrawUiComponentsContext = createContext({} as TLUiComponents)

type ComponentsContextProviderProps = {
	overrides?: TLUiComponents
	children: any
}

/** @public */
export function TldrawUiComponentsProvider({
	overrides,
	children,
}: ComponentsContextProviderProps) {
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
					...overrides,
				}),
				[overrides]
			)}
		>
			{children}
		</TldrawUiComponentsContext.Provider>
	)
}

/** @public */
export function useTldrawUiComponents() {
	return useContext(TldrawUiComponentsContext)
}
