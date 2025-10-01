import { captureException } from '@sentry/react'
import { type HistoryResponseBody } from '@tldraw/dotcom-shared'
import { useEffect, useState } from 'react'
import { useRouteError } from 'react-router-dom'
import { BoardHistoryLog } from '../../components/BoardHistoryLog/BoardHistoryLog'
import { defineLoader } from '../../utils/defineLoader'
import { fetchHistory } from '../../utils/fetchHistory'
import { TlaFileError } from '../components/TlaFileError/TlaFileError'
import { useMaybeApp } from '../hooks/useAppState'
import { TlaAnonLayout } from '../layouts/TlaAnonLayout/TlaAnonLayout'
import { toggleSidebar } from '../utils/local-session-state'

const { loader, useData } = defineLoader(async (args) => {
	const fileSlug = args.params.fileSlug

	if (!fileSlug) return null

	const data = await fetchHistory(fileSlug)
	if (!data) return null

	return { data, fileSlug } as { data: HistoryResponseBody; fileSlug: string }
})

export { loader }

export function ErrorBoundary() {
	const error = useRouteError()
	useEffect(() => {
		captureException(error)
	}, [error])
	return <Component error={error} />
}

export function Component({ error: _error }: { error?: unknown }) {
	const data = useData()
	const [allTimestamps, setAllTimestamps] = useState<string[]>([])
	const [hasMore, setHasMore] = useState(false)
	const [isLoading, setIsLoading] = useState(false)

	const userId = useMaybeApp()?.userId

	const error = _error || !data

	useEffect(() => {
		if (error && userId) {
			// force sidebar open
			toggleSidebar(true)
		}
	}, [error, userId])

	// Initialize with first batch of data
	useEffect(() => {
		if (data?.data) {
			setAllTimestamps(data.data.timestamps)
			setHasMore(data.data.hasMore)
		}
	}, [data?.data])

	const handleLoadMore = async () => {
		if (!data?.fileSlug || isLoading) return

		setIsLoading(true)
		try {
			// Get the earliest timestamp from the current list
			const earliestTimestamp = allTimestamps[allTimestamps.length - 1]

			const newData = await fetchHistory(data.fileSlug, earliestTimestamp)

			if (newData) {
				// Filter out any timestamps that already exist to prevent duplicates
				const uniqueNewTimestamps = newData.timestamps.filter(
					(timestamp) => !allTimestamps.includes(timestamp)
				)
				setAllTimestamps((prev) => [...prev, ...uniqueNewTimestamps])
				setHasMore(newData.hasMore)
			}
		} catch (err) {
			console.error('Failed to load more history:', err)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div>
			{error ? (
				<TlaFileError error={error} />
			) : (
				<TlaAnonLayout>
					<BoardHistoryLog
						data={allTimestamps}
						hasMore={hasMore}
						onLoadMore={handleLoadMore}
						isLoading={isLoading}
					/>
				</TlaAnonLayout>
			)}
		</div>
	)
}
