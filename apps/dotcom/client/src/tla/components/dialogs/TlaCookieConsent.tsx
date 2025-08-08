import { useAuth } from '@clerk/clerk-react'
import classNames from 'classnames'
import { memo, useCallback, useEffect, useState } from 'react'
import { useDialogs, useValue } from 'tldraw'
import {
	configureAnalytics,
	getStoredAnalyticsConsent,
	setStoredAnalyticsConsent,
} from '../../../utils/analytics'
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

	// Track consent preference internally
	const [hasConsentPreference, setHasConsentPreference] = useState(() => {
		// Initialize based on current state
		if (isSignedIn) {
			return user?.allowAnalyticsCookie !== null
		} else {
			return getStoredAnalyticsConsent() !== null
		}
	})

	// Update internal state when external state changes
	useEffect(() => {
		const currentPreference = isSignedIn
			? user?.allowAnalyticsCookie !== null
			: getStoredAnalyticsConsent() !== null
		setHasConsentPreference(currentPreference)
	}, [isSignedIn, user?.allowAnalyticsCookie])

	const handleAccept = useCallback(() => {
		if (isSignedIn && user && app) {
			app.updateUser({ id: user.id, allowAnalyticsCookie: true })
		} else {
			setStoredAnalyticsConsent(true)
			configureAnalytics(true)
		}
		// Update internal state immediately
		setHasConsentPreference(true)
	}, [app, user, isSignedIn])

	const handleReject = useCallback(() => {
		if (isSignedIn && user && app) {
			app.updateUser({ id: user.id, allowAnalyticsCookie: false })
		} else {
			setStoredAnalyticsConsent(false)
			configureAnalytics(false)
		}
		// Update internal state immediately
		setHasConsentPreference(true)
	}, [app, user, isSignedIn])

	const handleCustomize = useCallback(() => {
		addDialog({
			component: () => <TlaManageCookiesDialog onChange={() => setHasConsentPreference(true)} />,
		})
	}, [addDialog])

	if (hasConsentPreference) return null

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
