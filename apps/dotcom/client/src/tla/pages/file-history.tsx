import { captureException } from '@sentry/react'
import { FILE_PREFIX, type HistoryResponseBody } from '@tldraw/dotcom-shared'
import { useEffect, useState } from 'react'
import { useParams, useRouteError } from 'react-router-dom'
import { BoardHistoryLog } from '../../components/BoardHistoryLog/BoardHistoryLog'
import { fetchHistory } from '../../utils/fetchHistory'
import { TlaFileError } from '../components/TlaFileError/TlaFileError'
import { useMaybeApp } from '../hooks/useAppState'
import { useStaffApiJson } from '../hooks/useStaffApiJson'
import { TlaAnonLayout } from '../layouts/TlaAnonLayout/TlaAnonLayout'
import { toggleSidebar } from '../utils/local-session-state'

export function ErrorBoundary() {
	const error = useRouteError()
	useEffect(() => {
		captureException(error)
	}, [error])
	return <Component error={error} />
}

export function Component({ error: _error }: { error?: unknown }) {
	const { fileSlug } = useParams<{ fileSlug: string }>()
	const data = useStaffApiJson<HistoryResponseBody>(`/api/${FILE_PREFIX}/${fileSlug}/history`)
	const [allTimestamps, setAllTimestamps] = useState<string[]>([])
	const [hasMore, setHasMore] = useState(false)
	const [isLoading, setIsLoading] = useState(false)

	const userId = useMaybeApp()?.userId

	const error = _error || data === null

	useEffect(() => {
		if (error && userId) {
			// force sidebar open
			toggleSidebar(true)
		}
	}, [error, userId])

	// Initialize with first batch of data
	useEffect(() => {
		if (data) {
			setAllTimestamps(data.timestamps)
			setHasMore(data.hasMore)
		}
	}, [data])

	const handleLoadMore = async () => {
		if (!fileSlug || isLoading) return

		setIsLoading(true)
		try {
			// Get the earliest timestamp from the current list
			const earliestTimestamp = allTimestamps[allTimestamps.length - 1]
			const newData = await fetchHistory(fileSlug, earliestTimestamp)
			if (newData) {
				// Filter out any timestamps that already exist to prevent duplicates
				const seen = new Set(allTimestamps)
				const uniqueNewTimestamps = newData.timestamps.filter((timestamp) => !seen.has(timestamp))
				setAllTimestamps((prev) => [...prev, ...uniqueNewTimestamps])
				setHasMore(newData.hasMore)
			}
		} catch (err) {
			console.error('Failed to load more history:', err)
		} finally {
			setIsLoading(false)
		}
	}

	if (!error && !data) return null

	return (
		<div>
			{error ? (
				<TlaFileError error={error} />
			) : (
				<TlaAnonLayout>
					<BoardHistoryLog
						data={allTimestamps.map((timestamp) => ({ timestamp, href: `./${timestamp}` }))}
						hasMore={hasMore}
						onLoadMore={handleLoadMore}
						isLoading={isLoading}
					/>
				</TlaAnonLayout>
			)}
		</div>
	)
}
