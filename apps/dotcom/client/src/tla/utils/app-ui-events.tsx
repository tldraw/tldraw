import { TldrawAppSessionState } from '@tldraw/dotcom-shared'
import { createContext, ReactNode, useContext } from 'react'

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
	'export-image': { format: 'svg' | 'png' }
	'copy-share-link': { format: 'svg' | 'png' }
	'toggle-shared': { shared: boolean }
	'set-theme': { theme: 'dark' | 'light' | 'auto' }
}

/** @public */
export type TLAppUiData<K> = K extends null
	? { source: TLAppUiEventSource }
	: { source: TLAppUiEventSource } & K

/** @public */
export type TLAppUiHandler<T extends keyof TLAppUiEventMap = keyof TLAppUiEventMap> = (
	name: T,
	data: TLAppUiData<TLAppUiEventMap[T]>
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
