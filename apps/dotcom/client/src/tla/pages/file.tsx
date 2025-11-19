import { captureException } from '@sentry/react'
import { useEffect } from 'react'
import { useLocation, useParams, useRouteError } from 'react-router-dom'
import { useDialogs } from 'tldraw'
import { TlaEditor } from '../components/TlaEditor/TlaEditor'
import { TlaFileError } from '../components/TlaFileError/TlaFileError'
import { TlaFairyInviteDialog } from '../components/dialogs/TlaFairyInviteDialog'
import { TlaInviteDialog } from '../components/dialogs/TlaInviteDialog'
import { useMaybeApp } from '../hooks/useAppState'
import { useInviteDetails } from '../hooks/useInviteDetails'
import { ReadyWrapper } from '../hooks/useIsReady'
import { TlaAnonLayout } from '../layouts/TlaAnonLayout/TlaAnonLayout'
import { TlaSidebarLayout } from '../layouts/TlaSidebarLayout/TlaSidebarLayout'
import { toggleSidebar } from '../utils/local-session-state'

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
	const userId = app?.userId
	const inviteInfo = useInviteDetails()
	const dialogs = useDialogs()
	const location = useLocation()
	const fairyInviteToken = location.state?.fairyInviteToken

	const errorElem = error ? <TlaFileError error={error} /> : null

	useEffect(() => {
		if (error && userId) {
			// force sidebar open
			toggleSidebar(true)
		}
	}, [error, userId])

	useEffect(() => {
		if (inviteInfo && !inviteInfo.error && userId) {
			dialogs.addDialog({
				component: ({ onClose }) => <TlaInviteDialog inviteInfo={inviteInfo} onClose={onClose} />,
			})
		}
	}, [inviteInfo, dialogs, userId])

	useEffect(() => {
		if (fairyInviteToken) {
			dialogs.addDialog({
				component: ({ onClose }) => (
					<TlaFairyInviteDialog fairyInviteToken={fairyInviteToken} onClose={onClose} />
				),
			})
		}
	}, [fairyInviteToken, dialogs])

	useEffect(() => {
		if (app && fileSlug) {
			app.ensureFileVisibleInSidebar(fileSlug)
		}
	}, [app, fileSlug])

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

	// use a search param to hide the sidebar completely
	const isEmbed = !!new URLSearchParams(window.location.search).get('embed')

	return (
		<TlaSidebarLayout collapsible isEmbed={isEmbed}>
			{errorElem ?? <TlaEditor fileSlug={fileSlug} deepLinks isEmbed={isEmbed} />}
		</TlaSidebarLayout>
	)
}
