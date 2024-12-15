import { captureException } from '@sentry/react'
import { ROOM_PREFIX } from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/sync-core'
import { useEffect } from 'react'
import { useRouteError } from 'react-router-dom'
import { fetch } from 'tldraw'
import { BoardHistorySnapshot } from '../../components/BoardHistorySnapshot/BoardHistorySnapshot'
import { defineLoader } from '../../utils/defineLoader'
import { TlaEditorWrapper } from '../components/TlaEditor/TlaEditorWrapper'
import { TlaFileError } from '../components/TlaFileError/TlaFileError'
import { useMaybeApp } from '../hooks/useAppState'
import { TlaAnonLayout } from '../layouts/TlaAnonLayout/TlaAnonLayout'
import { TlaSidebarLayout } from '../layouts/TlaSidebarLayout/TlaSidebarLayout'
import { updateLocalSessionState } from '../utils/local-session-state'

/*
When a signed inuser visits a legacy history snapshot, the room should still work as normal.
The user should be able to interact with the snapshot in the same way as they used
to be able to interact with the snapshot prior to botcom. In the application UI,
the user should see the room as if it were owned by some other user. The share
menu should be replaced with a "Slurp file" button.

Slurping a file (or whatever) should create a new file in the user's account 
with all of the data from the legacy shared room. The new copy should have no 
relationship to the previous room, and the user should be able to edit it just
like any other file.
*/

// todo: Update editor layout, include top bar for anon users (branding, sign in, etc)

export function ErrorBoundary() {
	const error = useRouteError()
	useEffect(() => {
		captureException(error)
	}, [error])
	return <Component error={error} />
}

const { loader, useData } = defineLoader(async (args) => {
	const roomId = args.params.boardId
	const timestamp = args.params.timestamp

	if (!roomId) return null

	const result = await fetch(`/api/${ROOM_PREFIX}/${roomId}/history/${timestamp}`, {
		headers: {},
	})
	if (!result.ok) return null
	const data = (await result.json()) as RoomSnapshot

	return { data, roomId, timestamp }
})

export { loader }

export function Component({ error: _error }: { error?: unknown }) {
	const userId = useMaybeApp()?.userId

	const result = useData()

	const ts = result?.timestamp
	const error = _error || !result || !ts

	useEffect(() => {
		if (error && userId) {
			// force sidebar open
			updateLocalSessionState(() => ({ isSidebarOpen: true }))
		}
	}, [error, userId])

	// todo: restore ReadyWrapper and update board history snapshot to call ready()

	if (!userId) {
		return (
			// Override TlaEditor's internal ReadyWrapper. This prevents the anon layout chrome from rendering before the editor is ready.
			<>
				{error ? (
					<TlaFileError error={error} />
				) : (
					<TlaAnonLayout>
						<BoardHistorySnapshot data={result.data} roomId={result.roomId} timestamp={ts} />
					</TlaAnonLayout>
				)}
			</>
		)
	}

	return (
		<TlaSidebarLayout collapsible>
			{error ? (
				<TlaFileError error={error} />
			) : (
				<TlaEditorWrapper>
					<BoardHistorySnapshot data={result.data} roomId={result.roomId} timestamp={ts} />
				</TlaEditorWrapper>
			)}
		</TlaSidebarLayout>
	)
}
