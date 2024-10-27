import { TldrawAppFile, TldrawAppSessionState, TldrawAppUser } from '@tldraw/dotcom-shared'
import { ReactNode, createContext, useContext } from 'react'
import { Result } from 'tldraw'

/** @public */
export type TLAppUiEventSource =
	| 'sidebar'
	| 'user-preferences'
	| 'file-rename-dialog'
	| 'file-menu'
	| 'file-share-menu'
	| 'anon-landing-page'

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
	'set-shared-link-type': { type: TldrawAppFile['sharedLinkType'] | 'no-access' }
	'learn-more-sharing-link': null
	'learn-more-publishing': null
	'publish-file': { result: Result<string, string> }
	'unpublish-file': { result: Response }
	'copy-publish-link': null
	'sign-in-button': null
	'sign-out-button': null
	'learn-more-button': null
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
