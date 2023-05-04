import React, { useCallback } from 'react'
import { filterSensitiveData } from './util'


export type UiEventData = string | number | boolean
export function DefaultEventHandler(_eventName: string, _eventData?: UiEventData) {
	return
}
export type UiEventHandler = (eventName: string, eventData?: UiEventData) => void
export const UiEventsContext = React.createContext(DefaultEventHandler as UiEventHandler)

/** @public */
export function useUiEvents(): UiEventHandler {
	const handler = React.useContext(UiEventsContext)
	const callback = useCallback(
		(eventNameRaw: string, eventDataRaw?: UiEventData) => {
			const eventData = filterSensitiveData(eventDataRaw)
			const eventName = filterSensitiveData(eventNameRaw)
			return handler(eventName, eventData)
		},
		[handler]
	)

	return callback
}

export function uiEventsFactory(handler: UiEventHandler) {
	return (eventName: string, eventData?: UiEventData) => {
		handler(eventName, eventData)
	}
}
