import * as React from 'react'

/** @public */
export type TLUiEventSource =
	| 'menu'
	| 'context-menu'
	| 'zoom-menu'
	| 'navigation-zone'
	| 'quick-actions'
	| 'actions-menu'
	| 'kbd'
	| 'debug-panel'
	| 'page-menu'
	| 'share-menu'
	| 'toolbar'
	| 'people-menu'
	| 'dialog'
	| 'help-menu'
	| 'helper-buttons'

/** @public */
export interface TLUiEventMap {
	// Actions
	undo: undefined
	redo: undefined
	'group-shapes': undefined
	'ungroup-shapes': undefined
	'convert-to-embed': undefined
	'convert-to-bookmark': undefined
	'open-embed-link': undefined
	'toggle-auto-size': undefined
	'copy-as': { format: 'svg' | 'png' | 'json' }
	'export-as': { format: 'svg' | 'png' | 'json' }
	'edit-link': undefined
	'insert-embed': undefined
	'insert-media': undefined
	'align-shapes': {
		operation: 'left' | 'center-horizontal' | 'right' | 'top' | 'center-vertical' | 'bottom'
	}
	'duplicate-shapes': undefined
	'pack-shapes': undefined
	'stack-shapes': { operation: 'horizontal' | 'vertical' }
	'flip-shapes': { operation: 'horizontal' | 'vertical' }
	'distribute-shapes': { operation: 'horizontal' | 'vertical' }
	'stretch-shapes': { operation: 'horizontal' | 'vertical' }
	'reorder-shapes': {
		operation: 'toBack' | 'toFront' | 'forward' | 'backward'
	}
	'delete-shapes': undefined
	'select-all-shapes': undefined
	'select-none-shapes': undefined
	'rotate-ccw': undefined
	'rotate-cw': undefined
	'zoom-in': undefined
	'zoom-out': undefined
	'zoom-to-fit': undefined
	'zoom-to-selection': undefined
	'reset-zoom': undefined
	'zoom-into-view': undefined
	'zoom-to-content': undefined
	'open-menu': { id: string }
	'close-menu': { id: string }
	'create-new-project': undefined
	'save-project-to-file': undefined
	'open-file': undefined
	'select-tool': { id: string }
	print: undefined
	copy: undefined
	paste: undefined
	cut: undefined
	'toggle-transparent': undefined
	'toggle-snap-mode': undefined
	'toggle-tool-lock': undefined
	'toggle-grid-mode': undefined
	'toggle-dark-mode': undefined
	'toggle-focus-mode': undefined
	'toggle-debug-mode': undefined
	'exit-pen-mode': undefined
	'stop-following': undefined
}

/** @public */
export type TLUiEventHandler<T extends keyof TLUiEventMap = keyof TLUiEventMap> = (
	source: string,
	name: T,
	data?: TLUiEventMap[T]
) => void

/** @internal */
const defaultEventHandler: TLUiEventHandler = () => void null

/** @internal */
export const EventsContext = React.createContext({} as TLUiEventHandler)

/** @public */
export type EventsProviderProps = {
	onEvent?: TLUiEventHandler
	children: any
}

/** @public */
export function EventsProvider({ onEvent, children }: EventsProviderProps) {
	return (
		<EventsContext.Provider value={onEvent ?? defaultEventHandler}>
			{children}
		</EventsContext.Provider>
	)
}

/** @public */
export function useEvents(): TLUiEventHandler<keyof TLUiEventMap> {
	return React.useContext(EventsContext)
}
