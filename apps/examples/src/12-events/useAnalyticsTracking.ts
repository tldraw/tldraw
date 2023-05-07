/* eslint-disable import/no-extraneous-dependencies */
import posthog from 'posthog-js'
import { useCallback, useEffect, useRef } from 'react'

const VITE_POSTHOG_API_KEY = ''

export function useAnalyticsTracking(instanceId: string) {
	const rInitialized = useRef(false)

	useEffect(() => {
		if (!rInitialized.current && VITE_POSTHOG_API_KEY) {
			posthog.init(VITE_POSTHOG_API_KEY, {
				api_host: 'https://app.posthog.com',
			})
			posthog.group('instanceId', instanceId)

			rInitialized.current = true
		}
	}, [instanceId])

	return useCallback((eventName: string, eventData: any) => {
		if (rInitialized.current) {
			posthog.capture(eventName, eventData)
		}
	}, [])
}
