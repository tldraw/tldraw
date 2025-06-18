import { captureException } from '@sentry/react'
import { ROOM_PREFIX } from '@tldraw/dotcom-shared'
import { useEffect } from 'react'
import { useRouteError } from 'react-router-dom'
import { fetch } from 'tldraw'
import { BoardHistoryLog } from '../../components/BoardHistoryLog/BoardHistoryLog'
import { defineLoader } from '../../utils/defineLoader'
import { TlaFileError } from '../components/TlaFileError/TlaFileError'
import { useMaybeApp } from '../hooks/useAppState'
import { TlaAnonLayout } from '../layouts/TlaAnonLayout/TlaAnonLayout'
import { toggleSidebar } from '../utils/local-session-state'

/*
History here should work in an identical way to its previous implementation.
*/

// todo: Add top bar for anon users (branding, sign in, etc)

const { loader, useData } = defineLoader(async (args) => {
	const boardId = args.params.boardId

	if (!boardId) return null

	const result = await fetch(`/api/${ROOM_PREFIX}/${boardId}/history`, {
		headers: {},
	})
	if (!result.ok) return null
	const data = await result.json()

	return { data, boardId } as { data: string[]; boardId: string }
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
			// force sidebar open
			toggleSidebar(true)
		}
	}, [error, userId])

	return (
		// Override TlaEditor's internal ReadyWrapper. This prevents the anon layout chrome from rendering
		// before the editor is ready.
		<>
			{error ? (
				<TlaFileError error={error} />
			) : (
				<TlaAnonLayout>
					<BoardHistoryLog data={data.data} />
				</TlaAnonLayout>
			)}
		</>
	)
}
