import { useAuth } from '@clerk/clerk-react'
import classNames from 'classnames'
import { memo, useCallback } from 'react'
import { useDialogs, useValue } from 'tldraw'
import { handleConsentChange } from '../../../utils/analytics'
import { useMaybeApp } from '../../hooks/useAppState'
import { F } from '../../utils/i18n'
import styles from './dialogs.module.css'
import { TlaManageCookiesDialog } from './TlaManageCookiesDialog'

export const TlaCookieConsent = memo(function TlaSidebarCookieConsent() {
	const app = useMaybeApp()
	const { addDialog } = useDialogs()
	const auth = useAuth()

	const user = useValue('user id', () => app?.getUser(), [app])
	const isSignedIn = auth.isSignedIn

	const handleAccept = useCallback(() => {
		handleConsentChange(true, !!isSignedIn, user, app)
	}, [app, user, isSignedIn])

	const handleReject = useCallback(() => {
		handleConsentChange(false, !!isSignedIn, user, app)
	}, [app, user, isSignedIn])

	const handleCustomize = useCallback(() => {
		addDialog({
			component: () => <TlaManageCookiesDialog />,
		})
	}, [addDialog])

	return (
		<div className={styles.sidebarCookieConsent} data-testid="tla-sidebar-cookie-consent">
			<p className={styles.sidebarCookieText}>
				<F defaultMessage="This site uses cookies to make the app work and to collect analytics." />
			</p>
			<div className={styles.sidebarCookieButtonsRow}>
				<button
					className={classNames('tla-button-text', styles.sidebarCookieButton, styles.hoverable)}
					onClick={handleCustomize}
				>
					<F defaultMessage="Settings" />
				</button>
				<div className={styles.sidebarCookieButtons}>
					<button
						className={classNames('tla-button-text', styles.sidebarCookieButton, styles.hoverable)}
						onClick={handleReject}
					>
						<F defaultMessage="Opt out" />
					</button>
					<button
						className={classNames(
							'tla-button-text',
							styles.sidebarCookieButton,
							styles.sidebarCookieAcceptButton,
							styles.hoverable
						)}
						onClick={handleAccept}
					>
						<F defaultMessage="Accept all" />
					</button>
				</div>
			</div>
		</div>
	)
})
