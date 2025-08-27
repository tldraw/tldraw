import { trackEvent } from '../../utils/analytics'
import { TldrawApp } from '../app/TldrawApp'

export function useNewRoomCreationTracking() {
	return (app: TldrawApp | null, fileId: string) => {
		if (!app) return

		const creationData = app.getAndClearNewRoomCreationStartTime(fileId)

		if (creationData === null) return

		const loadTime = Date.now() - creationData.startTime

		// Send analytics data to PostHog
		trackEvent('room_creation_duration', {
			creation_time_ms: loadTime,
			source: creationData.source,
		})
	}
}
