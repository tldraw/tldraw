import { captureException } from '@sentry/react'
import { useEffect } from 'react'
import { useLocation, useParams, useRouteError } from 'react-router-dom'
import { TlaEditor } from '../components/TlaEditor/TlaEditor'
import { TlaFileError } from '../components/TlaFileError/TlaFileError'
import { useMaybeApp } from '../hooks/useAppState'
import { ReadyWrapper } from '../hooks/useIsReady'
import { TlaAnonLayout } from '../layouts/TlaAnonLayout/TlaAnonLayout'
import { TlaSidebarLayout } from '../layouts/TlaSidebarLayout/TlaSidebarLayout'
import { updateLocalSessionState } from '../utils/local-session-state'

export function ErrorBoundary() {
	const error = useRouteError()
	useEffect(() => {
		captureException(error)
	}, [error])
	return <Component error={error} />
}

export function Component({ error }: { error?: unknown }) {
	const { fileSlug } = useParams<{ fileSlug: string }>()
	if (!fileSlug) throw Error('File id not found')
	const userId = useMaybeApp()?.userId
	const routeState = useLocation().state

	const errorElem = error ? <TlaFileError error={error} /> : null

	useEffect(() => {
		if (error && userId) {
			// force sidebar open
			updateLocalSessionState(() => ({ isSidebarOpen: true }))
		}
	}, [error, userId])

	if (!userId) {
		return (
			// Override TlaEditor's internal ReadyWrapper. This prevents the anon layout chrome from rendering
			// before the editor is ready.
			<ReadyWrapper>
				{errorElem ?? (
					<TlaAnonLayout>
						<TlaEditor fileSlug={fileSlug} deepLinks />
					</TlaAnonLayout>
				)}
			</ReadyWrapper>
		)
	}

	return (
		<TlaSidebarLayout collapsible>
			{errorElem ?? <TlaEditor fileSlug={fileSlug} fileOpenState={routeState} deepLinks />}
		</TlaSidebarLayout>
	)
}
