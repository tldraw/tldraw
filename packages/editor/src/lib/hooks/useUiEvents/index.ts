import React, { useCallback } from 'react'
import { filterSensitiveData } from './util'

export type UiEventHandler = (event: any) => void
export const UiEventsContext = React.createContext((_eventName: string, _eventData?: any) => {
	return
})

/** @public */
export const useUiEvents = (): UiEventHandler => {
	const handler = React.useContext(UiEventsContext)
	return useCallback(
		(eventNameRaw: string, eventDataRaw?: any) => {
			const eventData = filterSensitiveData(eventDataRaw)
			const eventName = filterSensitiveData(eventNameRaw)
			return handler(eventName, eventData)
		},
		[handler]
	)
}
