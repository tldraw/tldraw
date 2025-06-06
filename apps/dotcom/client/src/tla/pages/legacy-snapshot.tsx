import { captureException } from '@sentry/react'
import { useEffect, useMemo } from 'react'
import { useParams, useRouteError } from 'react-router-dom'
import { SerializedSchema, TLRecord, TLStoreSnapshot, fetch } from 'tldraw'
import { defineLoader } from '../../utils/defineLoader'
import { TlaLegacySnapshotEditor } from '../components/TlaEditor/TlaLegacySnapshotEditor'
import { TlaFileError } from '../components/TlaFileError/TlaFileError'
import { useMaybeApp } from '../hooks/useAppState'
import { ReadyWrapper } from '../hooks/useIsReady'
import { TlaAnonLayout } from '../layouts/TlaAnonLayout/TlaAnonLayout'
import { TlaSidebarLayout } from '../layouts/TlaSidebarLayout/TlaSidebarLayout'
import { toggleSidebar } from '../utils/local-session-state'

/*
When a signed in user visits a legacy snapshot, the room should still work as normal.
The user should be able to interact with the snapshot in the same way as they used
to be able to interact with the snapshot prior to botcom. In the application UI,
the user should see the room as if it were owned by some other user. The share
menu should be replaced with a "Slurp file" button.

Slurping a file (or whatever) should create a new file in the user's account 
with all of the data from the legacy shared room. The new copy should have no 
relationship to the previous room, and the user should be able to edit it just
like any other file.
*/

const { loader, useData } = defineLoader(async (args) => {
	const roomId = args.params.roomId
	const result = await fetch(`/api/snapshot/${roomId}`)
	if (!result.ok) throw new Error('Room not found')

	const data = await result.json()
	if (!data || data.error) throw new Error('Room not found')
	return data as {
		roomId: string
		schema: SerializedSchema
		records: TLRecord[]
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
	const { roomId } = useParams<{ roomId: string }>()
	if (!roomId) throw Error('Room id not found')

	const userId = useMaybeApp()?.userId

	const result = useData()

	const snapshot = useMemo(() => {
		if (!result) {
			return null
		}

		return {
			schema: result.schema,
			store: Object.fromEntries(result.records.map((record) => [record.id, record])),
		} as TLStoreSnapshot
	}, [result])

	const error = _error || !snapshot

	useEffect(() => {
		if (error && userId) {
			// force sidebar open
			toggleSidebar(true)
		}
	}, [error, userId])

	if (!userId) {
		return (
			<ReadyWrapper>
				{error ? (
					<TlaFileError error={error} />
				) : (
					<TlaAnonLayout>
						<TlaLegacySnapshotEditor fileSlug={roomId} snapshot={snapshot} />
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
				<TlaLegacySnapshotEditor fileSlug={roomId} snapshot={snapshot} />
			)}
		</TlaSidebarLayout>
	)
}
