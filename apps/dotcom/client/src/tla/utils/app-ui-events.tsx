import { TlaFile, TlaUser } from '@tldraw/dotcom-shared'
import { ReactNode, createContext, useContext } from 'react'
import { trackEvent } from '../../utils/analytics'
import { TldrawAppSessionState } from './local-session-state'

/** @public */
export type TLAppUiEventSource =
	| 'sidebar'
	| 'sidebar-context-menu'
	| 'user-preferences'
	| 'file-rename-dialog'
	| 'file-menu'
	| 'file-share-menu'
	| 'file-header'
	| 'anon-landing-page'
	| 'anon-top-bar'
	| 'account-menu'
	| 'top-bar'
	| 'legacy-import-button'
	| 'new-page'
	| 'app'
	| 'cookie-settings'
	| 'dialog'
	| 'fairy-teaser'
	| 'fairy-panel'

/** @public */
export interface TLAppUiEventMap {
	'create-file': null
	'delete-file': null
	'rename-file': { name: string }
	'duplicate-file': null
	'download-file': null
	'drop-tldr-file': null
	'import-tldr-file': null
	'change-user-name': null
	'open-share-menu': null
	'change-share-menu-tab': { tab: TldrawAppSessionState['shareMenuActiveTab'] }
	'copy-share-link': null
	'copy-file-link': null
	'toggle-shared': { shared: boolean }
	'set-theme': { theme: 'dark' | 'light' | 'auto' }
	'toggle-export-padding': { padding: boolean }
	'toggle-export-background': { background: TlaUser['exportBackground'] }
	'set-export-format': { format: TlaUser['exportFormat'] }
	'set-export-theme': { theme: TlaUser['exportTheme'] }
	'export-image': {
		fullPage: boolean
		theme: TlaUser['exportTheme']
		format: TlaUser['exportFormat']
		padding: TlaUser['exportPadding']
		background: TlaUser['exportBackground']
	}
	'set-shared-link-type': { type: TlaFile['sharedLinkType'] | 'no-access' }
	'open-url': { destinationUrl: string }
	'publish-file': null
	'unpublish-file': null
	'copy-publish-link': null
	'sign-up-clicked': { ctaMessage: string }
	'sign-out-clicked': null
	'learn-more-button': null
	'sidebar-toggle': { value: boolean }
	'click-file-link': null
	'open-preview-sign-up-modal': null
	'create-user': null
	'room-size-warning-dialog-shown': null
	'room-size-limit-dialog-shown': null
	'accept-group-invite': null
	'add-file-link': null
	'click-fairy-teaser': { feat: 'fairy' }
	'fairy-send-message': { feat: 'fairy' }
	'fairy-summon': { feat: 'fairy' }
	'fairy-summon-all': { feat: 'fairy' }
	'fairy-summon-selected': { feat: 'fairy' }
	'fairy-sleep': { feat: 'fairy' }
	'fairy-sleep-all': { feat: 'fairy' }
	'fairy-put-away-selected': { feat: 'fairy' }
	'fairy-group-chat-message': { feat: 'fairy' }
	'fairy-reset-chat': { feat: 'fairy' }
	'fairy-reset-all-chats': { feat: 'fairy' }
	'fairy-follow': { feat: 'fairy' }
	'fairy-unfollow': { feat: 'fairy' }
	'fairy-zoom-to': { feat: 'fairy' }
	'fairy-disband-group': { feat: 'fairy' }
	'fairy-select': { feat: 'fairy' }
	'fairy-deselect': { feat: 'fairy' }
	'fairy-double-click': { feat: 'fairy' }
	'fairy-switch-to-task-list': { feat: 'fairy' }
	'fairy-switch-to-chat': { feat: 'fairy' }
	'fairy-start-project': { feat: 'fairy' }
	'fairy-add-to-selection': { feat: 'fairy' }
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
const defaultEventHandler: TLAppUiContextType = trackEvent

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
