import { captureException } from '@sentry/react'
import { ROOM_OPEN_MODE } from '@tldraw/dotcom-shared'
import { useEffect } from 'react'
import { useParams, useRouteError } from 'react-router-dom'
import { TlaLegacyFileEditor } from '../components/TlaEditor/TlaLegacyFileEditor'
import { TlaFileError } from '../components/TlaFileError/TlaFileError'
import { useMaybeApp } from '../hooks/useAppState'
import { ReadyWrapper } from '../hooks/useIsReady'
import { TlaAnonLayout } from '../layouts/TlaAnonLayout/TlaAnonLayout'
import { TlaSidebarLayout } from '../layouts/TlaSidebarLayout/TlaSidebarLayout'
import { toggleSidebar } from '../utils/local-session-state'

/*
When a signed in user visits a legacy shared room, the room should still work as normal.
The user should be able to participate in the room in the same way as they used
to be able to participate in the room prior to botcom. In the application UI,
the user should see the room as if it were owned by some other user. The share
menu should be replaced with a "Slurp file" button.

Slurping a file (or whatever) should create a new file in the user's account 
with all of the data from the legacy shared room. The new copy should have no 
relationship to the previous room, and the user should be able to edit it just
like any other file.
*/

export function ErrorBoundary() {
	const error = useRouteError()
	useEffect(() => {
		captureException(error)
	}, [error])
	return <Component error={error} />
}

export function Component({ error }: { error?: unknown }) {
	const { roomId } = useParams<{ roomId: string }>()
	if (!roomId) throw Error('Room id not found')

	const userId = useMaybeApp()?.userId

	useEffect(() => {
		if (error && userId) {
			// force sidebar open
			toggleSidebar(true)
		}
	}, [error, userId])

	if (!userId) {
		return (
			// Override TlaEditor's internal ReadyWrapper. This prevents the anon layout chrome from rendering
			// before the editor is ready.
			<ReadyWrapper>
				{error ? (
					<TlaFileError error={error} />
				) : (
					<TlaAnonLayout>
						<TlaLegacyFileEditor fileSlug={roomId} roomOpenMode={ROOM_OPEN_MODE.READ_ONLY} />
					</TlaAnonLayout>
				)}
			</ReadyWrapper>
		)
	}

	return (
		<TlaSidebarLayout collapsible>
			{error ? (
				<TlaFileError error={error} />
			) : (
				<TlaLegacyFileEditor fileSlug={roomId} roomOpenMode={ROOM_OPEN_MODE.READ_ONLY} />
			)}
		</TlaSidebarLayout>
	)
}
