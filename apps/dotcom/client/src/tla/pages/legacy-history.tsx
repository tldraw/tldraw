import { captureException } from '@sentry/react'
import { ROOM_PREFIX, type HistoryResponseBody } from '@tldraw/dotcom-shared'
import { useEffect } from 'react'
import { useParams, useRouteError } from 'react-router-dom'
import { BoardHistoryLog } from '../../components/BoardHistoryLog/BoardHistoryLog'
import { TlaFileError } from '../components/TlaFileError/TlaFileError'
import { useMaybeApp } from '../hooks/useAppState'
import { useStaffApiJson } from '../hooks/useStaffApiJson'
import { TlaAnonLayout } from '../layouts/TlaAnonLayout/TlaAnonLayout'
import { toggleSidebar } from '../utils/local-session-state'

/*
History here should work in an identical way to its previous implementation.
*/

// todo: Add top bar for anon users (branding, sign in, etc)

export function ErrorBoundary() {
	const error = useRouteError()
	useEffect(() => {
		captureException(error)
	}, [error])
	return <Component error={error} />
}

export function Component({ error: _error }: { error?: unknown }) {
	const { boardId } = useParams<{ boardId: string }>()
	const data = useStaffApiJson<HistoryResponseBody>(`/api/${ROOM_PREFIX}/${boardId}/history`)

	const userId = useMaybeApp()?.userId

	const error = _error || data === null

	useEffect(() => {
		if (error && userId) {
			// force sidebar open
			toggleSidebar(true)
		}
	}, [error, userId])

	if (error) return <TlaFileError error={error} />
	if (!data) return null

	return (
		<TlaAnonLayout>
			<BoardHistoryLog
				data={data.timestamps.map((timestamp) => ({ timestamp, href: `./${timestamp}` }))}
			/>
		</TlaAnonLayout>
	)
}
