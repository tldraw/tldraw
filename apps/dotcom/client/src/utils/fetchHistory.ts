import { FILE_PREFIX, type HistoryResponseBody } from '@tldraw/dotcom-shared'
import { fetch } from 'tldraw'

// Helper function to fetch history data
export async function fetchHistory(
	fileSlug: string,
	offset?: string
): Promise<HistoryResponseBody | null> {
	try {
		const url = offset
			? `/api/${FILE_PREFIX}/${fileSlug}/history?offset=${offset}`
			: `/api/${FILE_PREFIX}/${fileSlug}/history`

		const result = await fetch(url)

		if (!result.ok) return null

		return await result.json()
	} catch (err) {
		console.error('Failed to fetch history:', err)
		return null
	}
}

// Helper function to fetch Pierre history data
export async function fetchPierreHistory(
	fileSlug: string,
	nextCursor?: string | null
): Promise<{
	entries: Array<{ timestamp: string; commitHash: string }>
	nextCursor?: string | null
} | null> {
	try {
		const url = nextCursor
			? `/api/${FILE_PREFIX}/${fileSlug}/pierre-history?nextCursor=${nextCursor}`
			: `/api/${FILE_PREFIX}/${fileSlug}/pierre-history`

		const result = await fetch(url)

		if (!result.ok) return null

		return await result.json()
	} catch (err) {
		console.error('Failed to fetch Pierre history:', err)
		return null
	}
}
