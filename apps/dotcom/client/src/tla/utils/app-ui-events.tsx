import { TldrawAppSessionState, TldrawAppUser } from '@tldraw/dotcom-shared'
import { ReactNode, createContext, useContext } from 'react'

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
	'toggle-export-padding': { padding: TldrawAppUser['exportPadding'] }
	'toggle-export-background': { background: TldrawAppUser['exportBackground'] }
	'set-export-format': { format: TldrawAppUser['exportFormat'] }
	'set-export-theme': { theme: TldrawAppUser['exportTheme'] }
	'export-image': {
		fullPage: boolean
		theme: TldrawAppUser['exportTheme']
		format: TldrawAppUser['exportFormat']
		padding: TldrawAppUser['exportPadding']
		background: TldrawAppUser['exportBackground']
	}
}

/** @public */
export type TLAppUiData<K extends keyof TLAppUiEventMap> = TLAppUiEventMap[K] extends null
	? { source: TLAppUiEventSource }
	: {
			source: TLAppUiEventSource
		} & TLAppUiEventMap[K]

/** @public */
export type TLAppUiHandler<T extends keyof TLAppUiEventMap = keyof TLAppUiEventMap> = (
	name: T,
	data: TLAppUiData<T>
) => void

/** @public */
export type TLAppUiContextType = TLAppUiHandler<keyof TLAppUiEventMap>

/** @internal */
const defaultEventHandler: TLAppUiContextType = () => void null

/** @internal */
export const EventsContext = createContext<TLAppUiContextType | null>(null)

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
	return eventHandler ?? defaultEventHandler
}
