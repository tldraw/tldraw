import { useAuth } from '@clerk/clerk-react'
import { memo, useEffect, useState } from 'react'
import { TlaCookieConsent } from '../tla/components/dialogs/TlaCookieConsent'
import { getStoredAnalyticsConsent } from '../utils/analytics'
import styles from './TlaLoggedOutCookieConsent.module.css'

export const TlaLoggedOutCookieConsent = memo(function TlaLoggedOutCookieConsent() {
	const auth = useAuth()
	const [isVisible, setIsVisible] = useState(false)

	const isSignedIn = auth.isSignedIn
	const hasConsentPreference = getStoredAnalyticsConsent() !== null

	// Check if banner should be visible on mount and when consent changes
	useEffect(() => {
		if (!isSignedIn && !hasConsentPreference) {
			setIsVisible(true)
		} else {
			setIsVisible(false)
		}
	}, [isSignedIn, hasConsentPreference])

	// Don't render if signed in, has preference, or banner is hidden
	if (isSignedIn || hasConsentPreference || !isVisible) return null

	return (
		<div className={styles.loggedOutCookieConsent} data-testid="tla-logged-out-cookie-consent">
			<TlaCookieConsent />
		</div>
	)
})
