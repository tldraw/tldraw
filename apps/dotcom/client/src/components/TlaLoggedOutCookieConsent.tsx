import { memo } from 'react'
import { TlaCookieConsent } from '../tla/components/dialogs/TlaCookieConsent'
import { useAnalyticsConsent } from '../tla/hooks/useAnalyticsConsent'
import styles from './TlaLoggedOutCookieConsent.module.css'

export const TlaLoggedOutCookieConsent = memo(function TlaLoggedOutCookieConsent() {
	const consent = useAnalyticsConsent(false)
	if (consent !== null) return null
	return (
		<div className={styles.loggedOutCookieConsent} data-testid="tla-logged-out-cookie-consent">
			<TlaCookieConsent />
		</div>
	)
})
