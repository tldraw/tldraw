import { ComponentType, createContext, useContext, useMemo } from 'react'
import { DefaultMinimap } from '../components/Minimap/DefaultMinimap'
import { DefaultPageMenu } from '../components/PageMenu/PageMenu'
import {
	DefaultStylePanel,
	type TLUiStylePanelProps,
} from '../components/StylePanel/DefaultStylePanel'
import {
	DefaultStylePanelContent,
	TLUiStylePanelContentProps,
} from '../components/StylePanel/DefaultStylePanelContent'
import { DefaultActionsMenu } from '../components/menus/ActionsMenu/DefaultActionsMenu'
import { DefaultActionsMenuContent } from '../components/menus/ActionsMenu/DefaultActionsMenuContent'
import {
	DefaultContextMenu,
	TLUiContextMenuProps,
} from '../components/menus/ContextMenu/DefaultContextMenu'
import { DefaultContextMenuContent } from '../components/menus/ContextMenu/DefaultContextMenuContent'
import { DefaultHelpMenu } from '../components/menus/HelpMenu/DefaultHelpMenu'
import { DefaultHelpMenuContent } from '../components/menus/HelpMenu/DefaultHelpMenuContent'
import { DefaultMainMenu } from '../components/menus/MainMenu/DefaultMainMenu'
import { DefaultMainMenuContent } from '../components/menus/MainMenu/DefaultMainMenuContent'
import { DefaultZoomMenu } from '../components/menus/ZoomMenu/DefaultZoomMenu'
import { DefaultZoomMenuContent } from '../components/menus/ZoomMenu/DefaultZoomMenuContent'

export interface BaseTLUiComponents {
	ContextMenu: ComponentType<TLUiContextMenuProps>
	ContextMenuContent: ComponentType
	ActionsMenu: ComponentType
	ActionsMenuContent: ComponentType
	HelpMenu: ComponentType
	HelpMenuContent: ComponentType
	ZoomMenu: ComponentType
	ZoomMenuContent: ComponentType
	MainMenu: ComponentType
	MainMenuContent: ComponentType
	Minimap: ComponentType
	StylePanel: ComponentType<TLUiStylePanelProps>
	StylePanelContent: ComponentType<TLUiStylePanelContentProps>
	PageMenu: ComponentType
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
					ContextMenuContent: DefaultContextMenuContent,
					ActionsMenu: DefaultActionsMenu,
					ActionsMenuContent: DefaultActionsMenuContent,
					HelpMenu: DefaultHelpMenu,
					HelpMenuContent: DefaultHelpMenuContent,
					ZoomMenu: DefaultZoomMenu,
					ZoomMenuContent: DefaultZoomMenuContent,
					MainMenu: DefaultMainMenu,
					MainMenuContent: DefaultMainMenuContent,
					Minimap: DefaultMinimap,
					StylePanel: DefaultStylePanel,
					StylePanelContent: DefaultStylePanelContent,
					PageMenu: DefaultPageMenu,
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
