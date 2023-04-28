import React, { useCallback, useRef } from 'react'
import { filterSensitiveData, useWatcher, usePreviousPair } from './util'
import { useApp } from '../useApp'

export function DefaultEventHandler (_eventName: string, _eventData?: any) {
	return
}
export type UiEventHandler = (eventName: string, eventData?: any) => void
export const UiEventsContext = React.createContext(DefaultEventHandler as UiEventHandler)

/**
 * A hook to watch various data in the store and on the App instance.
 * 
 * @param fn the handler hook
 */
function useUiEventsHook (handler: UiEventHandler) {
	const handlerRef = useRef(handler)
	handlerRef.current = handler;
	const app = useApp()
	const [prevInstanceId, instanceId] = usePreviousPair('instanceId', () => app.instanceId, [app])

	/**
	 * ========================================================================
	 * NOTE: I want to watch the core data rather than littering the tracking
	 * calls through the code, because those can often forget to be updated.
	 * ========================================================================
	 */

	// Watch if the app.instanceId changes for the new document load
	useWatcher(
		'watch:store.instanceId',
		() => app.instanceId,
		(_prev, _next) => {
			handlerRef.current("document:load")
		},
		[app.instanceId]
	)

	// Watch if the app.pages changes for added/remove pages
	useWatcher(
		'pages',
		() => app.pages,
		(prevPages, pages) => {
			// Are we in the same editor still
			if (prevInstanceId === instanceId) {
				if (prevPages && prevPages.length < pages.length) {
					handlerRef.current("page:add")
				}
				else if (prevPages && prevPages.length > pages.length) {
					handlerRef.current("page:remove")
				}
			}
		},
		[prevInstanceId, instanceId, app.pages]
	)

	// Watch if the app.currentPage.id for user changing a page.
	useWatcher(
		'currentPage.id',
		() => app.currentPage.id,
		(_prev, _next) => {
			handlerRef.current("page:change")
		},
		[app.currentPage.id]
	)
}

/** @public */
export function useUiEvents (): UiEventHandler {
	const handler = React.useContext(UiEventsContext)
	const callback = useCallback(
		(eventNameRaw: string, eventDataRaw?: any) => {
			const eventData = filterSensitiveData(eventDataRaw)
			const eventName = filterSensitiveData(eventNameRaw)
			return handler(eventName, eventData)
		},
		[handler]
	)

	useUiEventsHook(callback)
	return callback;
}
