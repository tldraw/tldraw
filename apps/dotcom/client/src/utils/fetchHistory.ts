import { FILE_PREFIX, type HistoryResponseBody } from '@tldraw/dotcom-shared'
import { clerkAuthFetch } from './clerkAuthFetch'

// Helper function to fetch history data
export async function fetchHistory(
	fileSlug: string,
	offset?: string
): Promise<HistoryResponseBody | null> {
	try {
		const url = offset
			? `/api/${FILE_PREFIX}/${fileSlug}/history?offset=${offset}`
			: `/api/${FILE_PREFIX}/${fileSlug}/history`

		const result = await clerkAuthFetch(url)

		if (!result.ok) return null

		return await result.json()
	} catch (err) {
		console.error('Failed to fetch history:', err)
		return null
	}
}
