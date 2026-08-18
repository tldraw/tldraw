import { captureException } from '@sentry/react'
import { ROOM_OPEN_MODE, RoomOpenMode } from '@tldraw/dotcom-shared'
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
Legacy shared rooms keep working as they did before botcom, for anonymous and
signed-in users alike. A signed-in user sees the room as if it were owned by
someone else, with the share menu replaced by a "Slurp file" button that copies
the room's data into a brand new file in their account.

The read-only and old-read-only routes are the same page with a different room
open mode, so they build their route exports from `defineLegacyRoomPage`.
*/
export function defineLegacyRoomPage(roomOpenMode: RoomOpenMode) {
	function ErrorBoundary() {
		const error = useRouteError()
		useEffect(() => {
			captureException(error)
		}, [error])
		return <Component error={error} />
	}

	function Component({ error }: { error?: unknown }) {
		const { roomId } = useParams<{ roomId: string }>()
		if (!roomId) throw Error('Room id not found')

		const userId = useMaybeApp()?.userId

		useEffect(() => {
			if (error && userId) {
				toggleSidebar(true)
			}
		}, [error, userId])

		const content = error ? (
			<TlaFileError error={error} />
		) : (
			<TlaLegacyFileEditor fileSlug={roomId} roomOpenMode={roomOpenMode} />
		)

		if (!userId) {
			return (
				// Override TlaEditor's internal ReadyWrapper. This prevents the anon layout chrome from rendering
				// before the editor is ready.
				<ReadyWrapper>{error ? content : <TlaAnonLayout>{content}</TlaAnonLayout>}</ReadyWrapper>
			)
		}

		return <TlaSidebarLayout collapsible>{content}</TlaSidebarLayout>
	}

	return { Component, ErrorBoundary }
}

export const { Component, ErrorBoundary } = defineLegacyRoomPage(ROOM_OPEN_MODE.READ_WRITE)
