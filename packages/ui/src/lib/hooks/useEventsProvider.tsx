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

// export const REDACTED_VALUE = '[redacted]'

// /**
//  * Strip out tldraw sensitive data from the data value
//  *
//  * Note you shouldn't be just sending any old data to this and expecting it
//  * to filter it out. However this is a safeguard to stop users being tracked
//  * across sessions.
//  *
//  * @param item
//  * @returns
//  */
// export function filterValue(item: string | number) {
// 	if (typeof item === 'string') {
// 		if (item.match(/^user:/)) {
// 			return REDACTED_VALUE
// 		} else {
// 			return item
// 		}
// 	} else {
// 		return item
// 	}
// }

// export function filterObject(obj: Record<string, any>, fn: (item: any) => any) {
// 	const out: Record<string, any> = {}
// 	for (const [key, value] of Object.entries(obj)) {
// 		if (filterValue(key) !== REDACTED_VALUE) {
// 			out[key] = fn(value)
// 		}
// 	}
// 	return out
// }

// export function filterSensitiveData(raw: any): any {
// 	if (raw === undefined) {
// 		return
// 	}

// 	try {
// 		// Note: Slow but also really not large data being sent so bullet proof more important.
// 		const data = JSON.parse(JSON.stringify(raw))

// 		if (['string', 'number'].includes(typeof data)) {
// 			return filterValue(data)
// 		} else if (Array.isArray(data)) {
// 			return data.map(filterSensitiveData)
// 		} else if (data === null) {
// 			return data
// 		} else if (typeof data === 'object') {
// 			return filterObject(data, (item) => filterSensitiveData(item))
// 		} else if (typeof data === 'boolean') {
// 			return data
// 		} else {
// 			return REDACTED_VALUE
// 		}
// 	} catch (err: any) {
// 		console.error(err)
// 		return undefined
// 	}
// }
