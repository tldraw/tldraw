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

/** Backends serving commit-addressed history (git-based, unlike the timestamped R2 history). */
export type CommitHistorySource = 'pierre' | 'artifacts'

// Helper function to fetch commit-based history data (Pierre or Artifacts)
export async function fetchCommitHistory(
	source: CommitHistorySource,
	fileSlug: string,
	nextCursor?: string | null
): Promise<{
	entries: Array<{ timestamp: string; commitHash: string }>
	nextCursor?: string | null
} | null> {
	try {
		const url = nextCursor
			? `/api/${FILE_PREFIX}/${fileSlug}/${source}-history?nextCursor=${nextCursor}`
			: `/api/${FILE_PREFIX}/${fileSlug}/${source}-history`

		const result = await fetch(url)

		if (!result.ok) return null

		return await result.json()
	} catch (err) {
		console.error(`Failed to fetch ${source} history:`, err)
		return null
	}
}
