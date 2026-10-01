import { captureException } from '@sentry/react'
import { FILE_PREFIX, type HistoryResponseBody } from '@tldraw/dotcom-shared'
import { useEffect, useState } from 'react'
import { useParams, useRouteError } from 'react-router-dom'
import { BoardHistoryLog } from '../../components/BoardHistoryLog/BoardHistoryLog'
import { fetchHistory } from '../../utils/fetchHistory'
import { TlaFileError } from '../components/TlaFileError/TlaFileError'
import { useMaybeApp } from '../hooks/useAppState'
import { useFetchJson } from '../hooks/useFetchJson'
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
	const data = useFetchJson<HistoryResponseBody>(`/api/${FILE_PREFIX}/${fileSlug}/history`)
	const [olderPages, setOlderPages] = useState<HistoryResponseBody[]>([])
	const [isLoading, setIsLoading] = useState(false)

	const userId = useMaybeApp()?.userId

	const error = _error || data === null

	useEffect(() => {
		if (error && userId) {
			// force sidebar open
			toggleSidebar(true)
		}
	}, [error, userId])

	const pages = data ? [data, ...olderPages] : []
	// Pages can overlap at their boundaries, so dedupe.
	const allTimestamps = [...new Set(pages.flatMap((page) => page.timestamps))]
	const hasMore = pages.at(-1)?.hasMore ?? false

	const handleLoadMore = async () => {
		if (!fileSlug || isLoading) return

		setIsLoading(true)
		try {
			// Get the earliest timestamp from the current list
			const earliestTimestamp = allTimestamps[allTimestamps.length - 1]
			const newData = await fetchHistory(fileSlug, earliestTimestamp)
			if (newData) setOlderPages((prev) => [...prev, newData])
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
