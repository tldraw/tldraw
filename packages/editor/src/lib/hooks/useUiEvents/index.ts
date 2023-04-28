import React, { useCallback } from 'react'

export type UiEventHandler = (event: any) => void
export const UiEventsContext = React.createContext((_eventName: string, _eventData?: any) => {
	return
})

const REDACTED_VALUE = '[redacted]'

/**
 * Strip out tldraw sensitive data from the data value
 *
 * Note you shouldn't be just sending any old data to this and expecting it
 * to filter it out. However this is a safeguard to stop users being tracked
 * across sessions.
 *
 * @param item
 * @returns
 */
const filterValue = (item: string | number) => {
	if (item === 'string') {
		if (item.match(/^user:/)) {
			return REDACTED_VALUE
		} else {
			return item
		}
	} else {
		return item
	}
}

const filterObject = (obj: Record<string, any>, fn: (item: any) => any) => {
	const out: Record<string, any> = {}
	for (const key of Object.keys(obj)) {
		out[key] = fn(obj[key])
	}
	return out
}

const filterSensitiveData = (data: any): any => {
	if (['string', 'number'].includes(typeof data)) {
		return filterValue(data)
	} else if (Array.isArray(data)) {
		return data.map(filterSensitiveData)
	} else if (typeof data === 'object') {
		return filterObject(data, (item) => filterSensitiveData(item))
	} else {
		return null
	}
}

/** @public */
export const useUiEvents = (): UiEventHandler => {
	const handler = React.useContext(UiEventsContext)
	return useCallback(
		(eventName: string, eventDataRaw?: any) => {
			const eventData = filterSensitiveData(eventDataRaw)
			return handler(eventName, eventData)
		},
		[handler]
	)
}
