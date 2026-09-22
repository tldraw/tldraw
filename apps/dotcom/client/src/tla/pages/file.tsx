import { captureException } from '@sentry/react'
import { useEffect } from 'react'
import { useParams, useRouteError } from 'react-router-dom'
import { markFirstLoad } from '../../utils/firstLoad'
import { TlaEditor } from '../components/TlaEditor/TlaEditor'
import { TlaFileSyncHost } from '../components/TlaEditor/TlaFileSyncHost'
import { TlaFileError } from '../components/TlaFileError/TlaFileError'
import { useIsAppLoading, useMaybeApp } from '../hooks/useAppState'
import { ReadyWrapper } from '../hooks/useIsReady'
import { TlaAnonLayout } from '../layouts/TlaAnonLayout/TlaAnonLayout'
import { TlaSidebarLayout } from '../layouts/TlaSidebarLayout/TlaSidebarLayout'
import { toggleSidebar } from '../utils/local-session-state'

markFirstLoad('file-chunk-loaded')

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
	const app = useMaybeApp()
	const isAppLoading = useIsAppLoading()
	const userId = app?.userId

	const errorElem = error ? <TlaFileError error={error} /> : null

	useEffect(() => {
		if (error && userId) {
			// force sidebar open
			toggleSidebar(true)
		}
	}, [error, userId])

	// The embed search param hides the sidebar, and tells share-link tracking this is a host-page
	// view rather than a link follow, so it has to reach the editor on the anonymous path too.
	const isEmbed = !!new URLSearchParams(window.location.search).get('embed')

	if (!app && !isAppLoading) {
		return (
			// Override TlaEditor's internal ReadyWrapper. This prevents the anon layout chrome from rendering
			// before the editor is ready.
			<ReadyWrapper>
				{errorElem ?? (
					<TlaAnonLayout>
						<TlaFileSyncHost fileSlug={fileSlug}>
							<TlaEditor fileSlug={fileSlug} deepLinks isEmbed={isEmbed} />
						</TlaFileSyncHost>
					</TlaAnonLayout>
				)}
			</ReadyWrapper>
		)
	}

	if (errorElem) {
		// The sidebar needs the app; an error that lands before it has resolved shows bare.
		if (!app) return errorElem
		return (
			<TlaSidebarLayout collapsible isEmbed={isEmbed}>
				{errorElem}
			</TlaSidebarLayout>
		)
	}

	// The host sits at the same position before and after the app resolves so React keeps it
	// mounted: remounting it would drop the socket the whole point is to open early.
	return (
		<TlaFileSyncHost fileSlug={fileSlug}>
			{app && (
				<TlaSidebarLayout collapsible isEmbed={isEmbed}>
					<TlaEditor fileSlug={fileSlug} deepLinks isEmbed={isEmbed} />
				</TlaSidebarLayout>
			)}
		</TlaFileSyncHost>
	)
}
