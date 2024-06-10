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
	| 'unknown'

/** @public */
export interface TLUiEventMap {
	// Actions
	undo: null
	redo: null
	'change-language': { locale: string }
	'new-page': null
	'move-to-page': null
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
	'edit-link': null
	'insert-embed': null
	'insert-media': null
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
	'rotate-ccw': null
	'rotate-cw': null
	'zoom-in': null
	'zoom-out': null
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
	'toggle-dark-mode': null
	'toggle-wrap-mode': null
	'toggle-focus-mode': null
	'toggle-debug-mode': null
	'toggle-lock': null
	'toggle-reduce-motion': null
	'toggle-edge-scrolling': null
	'exit-pen-mode': null
	'stop-following': null
	'open-cursor-chat': null
	'zoom-tool': null
	'unlock-all': null
}

type Join<T, K> = K extends null
	? { [R in keyof T]: T[R] }
	: { [R in keyof T]: T[R] } & { [R in keyof K]: K[R] }

/** @public */
export type TLUiEventHandler<T extends keyof TLUiEventMap = keyof TLUiEventMap> = (
	name: T,
	data: Join<{ source: TLUiEventSource }, TLUiEventMap[T]>
) => void

/** @internal */
const defaultEventHandler: TLUiEventHandler = () => void null

/** @public */
export type TLUiEventContextType = TLUiEventHandler<keyof TLUiEventMap>

/** @internal */
export const EventsContext = React.createContext<TLUiEventContextType | null>(null)

/** @public */
export interface EventsProviderProps {
	onEvent?: TLUiEventHandler
	children: React.ReactNode
}

/** @public */
export function UiEventsProvider({ onEvent, children }: EventsProviderProps) {
	return (
		<EventsContext.Provider value={onEvent ?? defaultEventHandler}>
			{children}
		</EventsContext.Provider>
	)
}

/** @public */
export function useUiEvents() {
	const eventHandler = React.useContext(EventsContext)
	return eventHandler ?? defaultEventHandler
}
