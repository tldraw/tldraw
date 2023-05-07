import posthog from 'posthog-js'
import { useCallback, useEffect } from 'react'

export function usePosthog(instanceId: string) {
	useEffect(() => {
		posthog.init('phc_q2oPzaqyM5Q9SXzlSv1RSGEDgstOhBEGJ4ZehCAEWGt', {
			api_host: 'https://app.posthog.com',
		})
	})

	return useCallback(
		(eventName: string, eventData: any) => {
			posthog.group('instanceId', instanceId)
			posthog.capture(eventName, eventData)
		},
		[instanceId]
	)
}
