import { createContext, useContext, useMemo } from 'react'
import { BackToContent as DefaultBackToContent } from '../components/BackToContent'
import { DebugPanel as DefaultDebugPanel } from '../components/DebugPanel'
import { Dialogs as DefaultDialogs } from '../components/Dialogs'
import { FollowingIndicator as DefaultFollowingIndicator } from '../components/FollowingIndicator'
import { HelpMenu as DefaultHelpMenu } from '../components/HelpMenu'
import { MenuZone as DefaultMenuZone } from '../components/MenuZone'
import { NavigationZone as DefaultNavigationZone } from '../components/NavigationZone/NavigationZone'
import { ExitPenMode as DefaultExitPenMode } from '../components/PenModeToggle'
import { StopFollowing as DefaultStopFollowing } from '../components/StopFollowing'
import { StylePanel as DefaultStylePanel } from '../components/StylePanel/StylePanel'
import {
	ToastViewport as DefaultToastViewport,
	Toasts as DefaultToasts,
} from '../components/Toasts'
import { Toolbar as DefaultToolbar } from '../components/Toolbar/Toolbar'
import { Button as DefaultButton } from '../components/primitives/Button'

export interface BaseUiComponents {
	BackToContent: typeof DefaultBackToContent
	DebugPanel: typeof DefaultDebugPanel
	Dialogs: typeof DefaultDialogs
	FollowingIndicator: typeof DefaultFollowingIndicator
	HelpMenu: typeof DefaultHelpMenu
	MenuZone: typeof DefaultMenuZone
	NavigationZone: typeof DefaultNavigationZone
	ExitPenMode: typeof DefaultExitPenMode
	StopFollowing: typeof DefaultStopFollowing
	StylePanel: typeof DefaultStylePanel
	ToastViewport: typeof DefaultToastViewport
	Toasts: typeof DefaultToasts
	Toolbar: typeof DefaultToolbar
	Button: typeof DefaultButton
}

export type TLUiComponents = Partial<{
	[K in keyof BaseUiComponents]: BaseUiComponents[K] | null
}>

const UiComponentsContext = createContext({} as TLUiComponents)

type ComponentsContextProviderProps = {
	uiComponents?: TLUiComponents
	children: any
}

export function UiComponentsProvider({ uiComponents, children }: ComponentsContextProviderProps) {
	return (
		<UiComponentsContext.Provider
			value={useMemo(
				() => ({
					BackToContent: DefaultBackToContent,
					DebugPanel: DefaultDebugPanel,
					Dialogs: DefaultDialogs,
					FollowingIndicator: DefaultFollowingIndicator,
					HelpMenu: DefaultHelpMenu,
					MenuZone: DefaultMenuZone,
					NavigationZone: DefaultNavigationZone,
					ExitPenMode: DefaultExitPenMode,
					StopFollowing: DefaultStopFollowing,
					StylePanel: DefaultStylePanel,
					ToastViewport: DefaultToastViewport,
					Toasts: DefaultToasts,
					Toolbar: DefaultToolbar,
					Button: DefaultButton,
					...uiComponents,
				}),
				[uiComponents]
			)}
		>
			{children}
		</UiComponentsContext.Provider>
	)
}

export function useUiComponents() {
	return useContext(UiComponentsContext)
}
