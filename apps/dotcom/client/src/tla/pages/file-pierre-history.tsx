import { captureException } from '@sentry/react'
import { useEffect, useState } from 'react'
import { useRouteError } from 'react-router-dom'
import { BoardHistoryLog } from '../../components/BoardHistoryLog/BoardHistoryLog'
import { defineLoader } from '../../utils/defineLoader'
import { CommitHistorySource, fetchCommitHistory } from '../../utils/fetchHistory'
import { TlaFileError } from '../components/TlaFileError/TlaFileError'
import { useMaybeApp } from '../hooks/useAppState'
import { TlaAnonLayout } from '../layouts/TlaAnonLayout/TlaAnonLayout'
import { toggleSidebar } from '../utils/local-session-state'

interface CommitHistoryData {
	entries: Array<{ timestamp: string; commitHash: string }>
	nextCursor?: string | null
}

/** This module serves both commit-history backends; the route path names the source.
 * Anchored as a full path segment so a slug beginning with "artifacts-history" can't
 * misdetect. */
function sourceFromUrl(url: string): CommitHistorySource {
	return /\/artifacts-history(\/|$)/.test(new URL(url).pathname) ? 'artifacts' : 'pierre'
}

const { loader, useData } = defineLoader(async (args) => {
	const fileSlug = args.params.fileSlug

	if (!fileSlug) return null

	const source = sourceFromUrl(args.request.url)
	const data = await fetchCommitHistory(source, fileSlug)
	if (!data) return null

	return { data, fileSlug, source } as {
		data: CommitHistoryData
		fileSlug: string
		source: CommitHistorySource
	}
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
	const [allEntries, setAllEntries] = useState<Array<{ timestamp: string; commitHash: string }>>(
		data?.data.entries || []
	)
	const [nextCursor, setNextCursor] = useState<string | null>(data?.data?.nextCursor || null)
	const [isLoading, setIsLoading] = useState(false)

	const userId = useMaybeApp()?.userId

	const error = _error || !data

	useEffect(() => {
		if (error && userId) {
			// force sidebar open
			toggleSidebar(true)
		}
	}, [error, userId])

	const handleLoadMore = async () => {
		if (!data?.fileSlug || isLoading) return

		setIsLoading(true)
		try {
			const newData = await fetchCommitHistory(data.source, data.fileSlug, nextCursor)

			if (newData) {
				// Filter out any entries that already exist to prevent duplicates
				const uniqueNewEntries = newData.entries.filter(
					(entry) => !allEntries.some((e) => e.commitHash === entry.commitHash)
				)
				setAllEntries((prev) => [...prev, ...uniqueNewEntries])
				setNextCursor(newData.nextCursor ?? null)
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
						data={allEntries.map((record) => ({
							timestamp: record.timestamp,
							href: `./${record.commitHash}`,
						}))}
						hasMore={!!nextCursor}
						onLoadMore={handleLoadMore}
						isLoading={isLoading}
					/>
				</TlaAnonLayout>
			)}
		</div>
	)
}
