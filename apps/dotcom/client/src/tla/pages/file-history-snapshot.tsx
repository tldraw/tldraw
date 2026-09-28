import { captureException } from '@sentry/react'
import { FILE_PREFIX } from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/sync-core'
import { useEffect, useMemo } from 'react'
import { useParams, useRouteError } from 'react-router-dom'
import { TLStoreSnapshot, fetch } from 'tldraw'
import { TlaHistorySnapshotEditor } from '../components/TlaEditor/TlaHistorySnapshotEditor'
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
	const userId = useMaybeApp()?.userId

	const { fileSlug, timestamp } = useParams<{ fileSlug: string; timestamp: string }>()
	const data = useFetchJson<RoomSnapshot>(`/api/${FILE_PREFIX}/${fileSlug}/history/${timestamp}`)

	const snapshot = useMemo(() => {
		if (!data) {
			return null
		}

		return {
			schema: data.schema,
			store: Object.fromEntries(data.documents.map((record) => [record.state.id, record.state])),
		} as TLStoreSnapshot
	}, [data])

	const error = _error || data === null || !fileSlug || !timestamp

	useEffect(() => {
		if (error && userId) {
			// force sidebar open
			toggleSidebar(true)
		}
	}, [error, userId])

	if (error) return <TlaFileError error={error} />
	if (!snapshot) return null

	return (
		<TlaAnonLayout>
			<TlaHistorySnapshotEditor
				fileSlug={fileSlug}
				snapshot={snapshot}
				onRestore={async () => {
					const res = await fetch(`/api/app/file/${fileSlug}/restore`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({ timestamp }),
					})
					if (!res.ok) {
						throw new Error('Failed to restore version: ' + (await res.text()))
					}
				}}
			/>
		</TlaAnonLayout>
	)
}
