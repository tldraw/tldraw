import { captureException } from '@sentry/react'
import { FILE_PREFIX } from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/sync-core'
import { useEffect, useMemo } from 'react'
import { useRouteError } from 'react-router-dom'
import { TLStoreSnapshot, fetch } from 'tldraw'
import { defineLoader } from '../../utils/defineLoader'
import { TlaHistorySnapshotEditor } from '../components/TlaEditor/TlaHistorySnapshotEditor'
import { TlaFileError } from '../components/TlaFileError/TlaFileError'
import { useMaybeApp } from '../hooks/useAppState'
import { TlaAnonLayout } from '../layouts/TlaAnonLayout/TlaAnonLayout'
import { toggleSidebar } from '../utils/local-session-state'

export function ErrorBoundary() {
	const error = useRouteError()
	useEffect(() => {
		captureException(error)
	}, [error])
	return <Component error={error} />
}

const { loader, useData } = defineLoader(async (args) => {
	const fileSlug = args.params.fileSlug
	const timestamp = args.params.timestamp

	if (!fileSlug) return null

	const result = await fetch(`/api/${FILE_PREFIX}/${fileSlug}/history/${timestamp}`, {
		headers: {},
	})
	if (!result.ok) return null
	const data = (await result.json()) as RoomSnapshot

	return { data, fileSlug, timestamp }
})

export { loader }

export function Component({ error: _error }: { error?: unknown }) {
	const userId = useMaybeApp()?.userId

	const result = useData()

	const snapshot = useMemo(() => {
		if (!result) {
			return null
		}

		return {
			schema: result.data.schema,
			store: Object.fromEntries(
				result.data.documents.map((record) => [record.state.id, record.state])
			),
		} as TLStoreSnapshot
	}, [result])

	const ts = result?.timestamp
	const error = _error || !result || !ts || !snapshot

	useEffect(() => {
		if (error && userId) {
			// force sidebar open
			toggleSidebar(true)
		}
	}, [error, userId])

	return (
		<>
			{error ? (
				<TlaFileError error={error} />
			) : (
				<TlaAnonLayout>
					<TlaHistorySnapshotEditor
						fileSlug={result.fileSlug}
						snapshot={snapshot}
						timestamp={ts}
						isApp
					/>
				</TlaAnonLayout>
			)}
		</>
	)
}
