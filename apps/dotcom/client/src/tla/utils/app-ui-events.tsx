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
	| 'fairy-canvas'
	| 'fairy-sidebar'
	| 'fairy-chat'

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
	// Fairy events - selection and interaction
	'fairy-select': { fairyId: string }
	'fairy-deselect': { fairyId: string }
	'fairy-add-to-selection': { fairyId: string }
	'fairy-double-click': { fairyId: string }
	// Fairy events - messaging
	'fairy-send-message': { fairyId: string }
	'fairy-group-chat-message': { projectId: string }
	'fairy-cancel-generation': { fairyId: string }
	// Fairy events - project
	'fairy-start-project': { projectId: string; memberCount: number; projectType: 'duo' | 'group' }
	'fairy-disband-group': { projectId: string }
	// Fairy events - navigation
	'fairy-summon': { fairyId: string }
	'fairy-summon-all': null
	'fairy-zoom-to': { fairyId: string }
	'fairy-follow': { fairyId: string }
	'fairy-unfollow': { fairyId: string }
	// Fairy events - state management
	'fairy-sleep': { fairyId: string }
	'fairy-sleep-all': null
	'fairy-wake': { fairyId: string }
	// Fairy events - customization
	'fairy-configure': { fairyId: string }
	// Fairy events - chat management
	'fairy-reset-chat': { fairyId: string }
	'fairy-reset-all-chats': null
	// Fairy events - panel/UI state
	'fairy-switch-to-manual': null
	'fairy-close-manual': null
	'fairy-switch-manual-tab': { tab: 'introduction' | 'usage' | 'about' }
	'fairy-close-chat-panel': null
	'fairy-select-all': null
	'fairy-deselect-all': null
	// Fairy events - drag/throw
	'fairy-drag-start': { fairyId: string }
	'fairy-panic': { fairyId: string }
	// Fairy events - teaser
	'click-fairy-teaser': null
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
