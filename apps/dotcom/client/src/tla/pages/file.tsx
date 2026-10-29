import { lazy, Suspense, useEffect } from 'react'
import { useLocation, useParams, useRouteError } from 'react-router-dom'
import { markFirstLoad } from '../../utils/firstLoad'
import { captureRouteError } from '../../utils/routeErrors'
import { TlaEditor } from '../components/TlaEditor/TlaEditor'
import { TlaFileSyncHost } from '../components/TlaEditor/TlaFileSyncHost'
import { TlaFileError } from '../components/TlaFileError/TlaFileError'
import { FileHistoryMode } from '../components/VersionHistory/FileHistoryMode'
import { useIsAppLoading, useMaybeApp } from '../hooks/useAppState'
import { ReadyWrapper } from '../hooks/useIsReady'
import { useVersionHistoryEnabled } from '../hooks/useVersionHistoryEnabled'
import { TlaAnonLayout } from '../layouts/TlaAnonLayout/TlaAnonLayout'
import { TlaSidebarLayout } from '../layouts/TlaSidebarLayout/TlaSidebarLayout'
import { parseHistoryRoute } from '../utils/historyRoute'
import { toggleSidebar } from '../utils/local-session-state'
import styles from './file.module.css'

markFirstLoad('file-chunk-loaded')

const LegacyHistoryList = lazy(() =>
	import('./file-history').then((m) => ({ default: m.Component }))
)
const LegacyHistorySnapshot = lazy(() =>
	import('./file-history-snapshot').then((m) => ({ default: m.Component }))
)

export function ErrorBoundary() {
	const error = useRouteError()
	useEffect(() => {
		captureRouteError(error)
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
	const history = parseHistoryRoute(useLocation().pathname)
	const historyEnabled = useVersionHistoryEnabled()

	useEffect(() => {
		if (error && userId) {
			// force sidebar open
			toggleSidebar(true)
		}
	}, [error, userId])

	const showHistory = history.inHistory && !!historyEnabled
	// Without the flag, history is the standalone pages, as before.
	if (history.inHistory && historyEnabled === false) {
		return (
			<Suspense fallback={null}>
				{history.ts ? <LegacyHistorySnapshot /> : <LegacyHistoryList />}
			</Suspense>
		)
	}

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
				{app && (
					<div className={styles.fileArea}>
						{/* Kept mounted (just hidden) while history is open, so closing it is instant. */}
						<div className={styles.liveEditor} data-hidden={showHistory || undefined}>
							<TlaEditor fileSlug={fileSlug} deepLinks isEmbed={isEmbed} />
						</div>
						{showHistory && <FileHistoryMode fileSlug={fileSlug} ts={history.ts} />}
					</div>
				)}
			</TlaFileSyncHost>
		</TlaSidebarLayout>
	)
}
