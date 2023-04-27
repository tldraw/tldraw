import React, { useCallback } from 'react'

export type UiEventHandler = (event: any) => void
export const UiEventsContext = React.createContext((_event: any) => {
	return
})

/** @public */
export const useUiEvents = (): UiEventHandler => {
	const handler = React.useContext(UiEventsContext)
	return useCallback(
		(event: any) => {
			return handler(event)
		},
		[handler]
	)
}
