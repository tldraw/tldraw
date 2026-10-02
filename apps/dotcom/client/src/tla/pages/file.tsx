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
						<TlaFileSyncHost key={fileSlug} fileSlug={fileSlug}>
							<TlaEditor fileSlug={fileSlug} deepLinks isEmbed={isEmbed} />
						</TlaFileSyncHost>
					</TlaAnonLayout>
				)}
			</ReadyWrapper>
		)
	}

	if (errorElem) {
		return (
			<TlaSidebarLayout collapsible isEmbed={isEmbed}>
				{errorElem}
			</TlaSidebarLayout>
		)
	}

	// The layout is the stable ancestor: it survives both the app arriving and a file switch, so
	// the sidebar is not rebuilt per file. The host is keyed by slug because useSync keeps
	// reporting the old room's store as synced while a changed uri is still connecting.
	return (
		<TlaSidebarLayout collapsible isEmbed={isEmbed}>
			<TlaFileSyncHost key={fileSlug} fileSlug={fileSlug}>
				{app && <TlaEditor fileSlug={fileSlug} deepLinks isEmbed={isEmbed} />}
			</TlaFileSyncHost>
		</TlaSidebarLayout>
	)
}
