import { ReactNode, createContext, useContext } from 'react'
import { User } from '../app/schema'
import { TldrawAppSessionState } from './local-session-state'

/** @public */
export type TLAppUiEventSource =
	| 'sidebar'
	| 'user-preferences'
	| 'file-rename-dialog'
	| 'file-menu'
	| 'file-share-menu'

/** @public */
export interface TLAppUiEventMap {
	'create-file': null
	'delete-file': null
	'rename-file': null
	'duplicate-file': null
	'drop-tldr-file': null
	'import-tldr-file': null
	'change-user-name': null
	'click-watermark': null
	'change-share-menu-tab': { tab: TldrawAppSessionState['shareMenuActiveTab'] }
	'copy-share-link': null
	'toggle-shared': { shared: boolean }
	'set-theme': { theme: 'dark' | 'light' | 'auto' }
	'toggle-export-padding': { padding: boolean }
	'toggle-export-background': { background: User['exportBackground'] }
	'set-export-format': { format: User['exportFormat'] }
	'set-export-theme': { theme: User['exportTheme'] }
	'export-image': {
		fullPage: boolean
		theme: User['exportTheme']
		format: User['exportFormat']
		padding: User['exportPadding']
		background: User['exportBackground']
	}
}

/** @public */
export type TLAppUiHandler = <T extends keyof TLAppUiEventMap>(
	name: T,
	data: { source: TLAppUiEventSource } & (TLAppUiEventMap[T] extends null
		? object
		: TLAppUiEventMap[T])
) => void

/** @public */
export type TLAppUiContextType = TLAppUiHandler

/** @internal */
const defaultEventHandler: TLAppUiContextType = () => void null

/** @internal */
export const EventsContext = createContext<TLAppUiContextType>(defaultEventHandler)

/** @public */
export interface TldrawAppUiEventsProviderProps {
	onEvent?: TLAppUiHandler
	children: ReactNode
}

/** @public @react */
export function TldrawAppUiEventsProvider({ onEvent, children }: TldrawAppUiEventsProviderProps) {
	return (
		<EventsContext.Provider value={onEvent ?? defaultEventHandler}>
			{children}
		</EventsContext.Provider>
	)
}

/** @public */
export function useTldrawAppUiEvents(): TLAppUiContextType {
	const eventHandler = useContext(EventsContext)
	return eventHandler
}
