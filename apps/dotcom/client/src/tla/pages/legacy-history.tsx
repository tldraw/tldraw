import { captureException } from '@sentry/react'
import { ROOM_PREFIX, type HistoryResponseBody } from '@tldraw/dotcom-shared'
import { useEffect } from 'react'
import { useRouteError } from 'react-router-dom'
import { fetch } from 'tldraw'
import { BoardHistoryLog } from '../../components/BoardHistoryLog/BoardHistoryLog'
import { defineLoader } from '../../utils/defineLoader'
import { TlaFileError } from '../components/TlaFileError/TlaFileError'
import { useMaybeApp } from '../hooks/useAppState'
import { TlaAnonLayout } from '../layouts/TlaAnonLayout/TlaAnonLayout'
import { toggleSidebar } from '../utils/local-session-state'

const { loader, useData } = defineLoader(async (args) => {
	const boardId = args.params.boardId

	if (!boardId) return null

	const result = await fetch(`/api/${ROOM_PREFIX}/${boardId}/history`)
	if (!result.ok) return null
	const data = await result.json()

	return { data, boardId } as { data: HistoryResponseBody; boardId: string }
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

	const userId = useMaybeApp()?.userId

	const error = _error || !data

	useEffect(() => {
		if (error && userId) {
			toggleSidebar(true)
		}
	}, [error, userId])

	return error ? (
		<TlaFileError error={error} />
	) : (
		<TlaAnonLayout>
			<BoardHistoryLog
				data={data.data.timestamps.map((timestamp) => ({ timestamp, href: `./${timestamp}` }))}
			/>
		</TlaAnonLayout>
	)
}
