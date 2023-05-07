import vs from '@vercel/analytics'
import { useCallback } from 'react'

export function useVercel(instanceId: string) {
	return useCallback(
		(eventName: string, eventData = {}) => {
			vs.track(eventName, { ...eventData, instanceId })
		},
		[instanceId]
	)
}
