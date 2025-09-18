import * as React from 'react'

/** @public */
export type TLUiEventSource =
	| 'menu'
	| 'main-menu'
	| 'context-menu'
	| 'zoom-menu'
	| 'document-name'
	| 'navigation-zone'
	| 'quick-actions'
	| 'actions-menu'
	| 'kbd'
	| 'debug-panel'
	| 'page-menu'
	| 'share-menu'
	| 'export-menu'
	| 'toolbar'
	| 'people-menu'
	| 'dialog'
	| 'help-menu'
	| 'helper-buttons'
	| 'style-panel'
	| 'rich-text-menu'
	| 'image-toolbar'
	| 'video-toolbar'
	| 'unknown'

/** @public */
export interface TLUiEventMap {
	// Actions
	undo: null
	redo: null
	'change-language': { locale: string }
	'change-page': { direction?: 'prev' | 'next' }
	'select-adjacent-shape': { direction: 'prev' | 'next' | 'left' | 'right' | 'up' | 'down' }
	'delete-page': null
	'duplicate-page': null
	'move-page': null
	'new-page': null
	'rename-page': null
	'move-to-page': null
	'move-to-new-page': null
	'rename-document': null
	'group-shapes': null
	'ungroup-shapes': null
	'remove-frame': null
	'fit-frame-to-content': null
	'convert-to-embed': null
	'convert-to-bookmark': null
	'open-embed-link': null
	'toggle-auto-size': null
	'copy-as': { format: 'svg' | 'png' | 'json' }
	'export-as': { format: 'svg' | 'png' | 'json' }
	'export-all-as': { format: 'svg' | 'png' | 'json' }
	'download-original': null
	'edit-link': null
	'insert-embed': null
	'insert-media': null
	'replace-media': null
	'image-manipulate': null
	'alt-text-start': null
	'set-alt-text': null
	'align-shapes': {
		operation: 'left' | 'center-horizontal' | 'right' | 'top' | 'center-vertical' | 'bottom'
	}
	'duplicate-shapes': null
	'pack-shapes': null
	'stack-shapes': { operation: 'horizontal' | 'vertical' }
	'flip-shapes': { operation: 'horizontal' | 'vertical' }
	'distribute-shapes': { operation: 'horizontal' | 'vertical' }
	'stretch-shapes': { operation: 'horizontal' | 'vertical' }
	'reorder-shapes': {
		operation: 'toBack' | 'toFront' | 'forward' | 'backward'
	}
	'delete-shapes': null
	'select-all-shapes': null
	'select-none-shapes': null
	'rotate-ccw': { fine: boolean }
	'rotate-cw': { fine: boolean }
	'zoom-in': { towardsCursor: boolean }
	'zoom-out': { towardsCursor: boolean }
	'zoom-to-fit': null
	'zoom-to-selection': null
	'reset-zoom': null
	'zoom-into-view': null
	'zoom-to-content': null
	'open-menu': { id: string }
	'close-menu': { id: string }
	'create-new-project': null
	'save-project-to-file': null
	'open-file': null
	'select-tool': { id: string }
	print: null
	copy: null
	paste: null
	cut: null
	'set-style': { id: string; value: string | number }
	'toggle-transparent': null
	'toggle-snap-mode': null
	'toggle-tool-lock': null
	'toggle-grid-mode': null
	'toggle-wrap-mode': null
	'toggle-focus-mode': null
	'input-mode': { value: string }
	'toggle-debug-mode': null
	'toggle-dynamic-size-mode': null
	'toggle-paste-at-cursor': null
	'toggle-lock': null
	'toggle-reduce-motion': null
	'toggle-keyboard-shortcuts': null
	'enhanced-a11y-mode': null
	'toggle-edge-scrolling': null
	'color-scheme': { value: string }
	'exit-pen-mode': null
	'start-following': null
	'stop-following': null
	'set-color': null
	'change-user-name': null
	'open-cursor-chat': null
	'zoom-tool': null
	'unlock-all': null
	'enlarge-shapes': null
	'shrink-shapes': null
	'flatten-to-image': null
	'a11y-repeat-shape-announce': null
	'open-url': { destinationUrl: string }
	'open-context-menu': null
	'adjust-shape-styles': null
	'copy-link': null
	'drag-tool': { id: string }
	'image-replace': null
	'video-replace': null
	'open-kbd-shortcuts': null
	'rich-text': {
		operation:
			| 'bold'
			| 'strike'
			| 'link'
			| 'link-edit'
			| 'link-visit'
			| 'link-remove'
			| 'heading'
			| 'bulletList'
	}
	edit: null
}

/** @public */
export type TLUiEventData<K> = K extends null
	? { source: TLUiEventSource }
	: { source: TLUiEventSource } & K

/** @public */
export type TLUiEventHandler = <T extends keyof TLUiEventMap>(
	name: T,
	data: TLUiEventData<TLUiEventMap[T]>
) => void

/** @public */
export type TLUiEventContextType = TLUiEventHandler

/** @internal */
const defaultEventHandler: TLUiEventContextType = () => void null

/** @internal */
export const EventsContext = React.createContext<TLUiEventContextType | null>(null)

/** @public */
export interface EventsProviderProps {
	onEvent?: TLUiEventHandler
	children: React.ReactNode
}

/** @public @react */
export function TldrawUiEventsProvider({ onEvent, children }: EventsProviderProps) {
	return (
		<EventsContext.Provider value={onEvent ?? defaultEventHandler}>
			{children}
		</EventsContext.Provider>
	)
}

/** @public */
export function useUiEvents(): TLUiEventContextType {
	const eventHandler = React.useContext(EventsContext)
	return eventHandler ?? defaultEventHandler
}
