import { ROOM_SIZE_LIMIT_MB } from '@tldraw/dotcom-shared'
import { useRef } from 'react'
import { Editor } from 'tldraw'
import { trackEvent } from '../utils/analytics'

function getFileSizeBucket(sizeMB: number): string {
	if (sizeMB <= 1) return '0-1 MB'
	if (sizeMB <= 5) return '1-5 MB'
	if (sizeMB <= 10) return '5-10 MB'
	return '10+ MB'
}

export function useRoomLoadTracking() {
	const loadStartTime = useRef(Date.now())

	return (editor: Editor) => {
		const loadTime = Date.now() - loadStartTime.current
		let estimatedFileSizeMB = 0
		try {
			const meta = editor.getDocumentSettings().meta
			const storagePercentage =
				typeof meta.storageUsedPercentage === 'number' ? meta.storageUsedPercentage : 0
			// Calculate estimated file size based on storage percentage
			estimatedFileSizeMB = (storagePercentage / 100) * ROOM_SIZE_LIMIT_MB
		} catch (error) {
			console.warn('Failed to get storage percentage for analytics:', error)
		}

		const fileSizeBucket = getFileSizeBucket(estimatedFileSizeMB)

		// Send analytics data to PostHog
		trackEvent('room_load_duration', {
			load_time_ms: loadTime,
			file_size_bucket: fileSizeBucket,
		})
	}
}
