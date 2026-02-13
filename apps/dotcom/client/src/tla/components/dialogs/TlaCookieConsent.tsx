import { fetch } from '@tldraw/utils'
import classNames from 'classnames'
import { memo, useCallback, useEffect, useState } from 'react'
import { useDialogs, useValue } from 'tldraw'
import { useAnalyticsConsent } from '../../hooks/useAnalyticsConsent'
import { F } from '../../utils/i18n'
import styles from './dialogs.module.css'
import { TlaManageCookiesDialog } from './TlaManageCookiesDialog'

const MANAGE_COOKIES_DIALOG = 'manageCookiesDialog'

type ConsentCheckResult = 'requires-consent' | 'no-consent-needed'

/**
 * Checks if consent is required based on CloudFlare geolocation headers
 * @returns Promise<'requires-consent' | 'no-consent-needed'> - 'requires-consent' if explicit consent is required, 'no-consent-needed' if confident it's not
 */
async function shouldRequireConsent(): Promise<ConsentCheckResult> {
	try {
		const response = await fetch('https://consent.tldraw.xyz')
		if (response.ok) {
			const data = await response.json()
			// Worker returns { requires_consent: boolean, country_code: string }
			if (typeof data.requires_consent === 'boolean') {
				return data.requires_consent ? 'requires-consent' : 'no-consent-needed'
			}
		}
	} catch (error) {
		// Fetch failed or timed out - will default to requiring consent
		console.warn('Consent check failed, defaulting to requiring consent:', error)
	}

	// Conservative default: require consent
	return 'requires-consent'
}

export const TlaCookieConsent = memo(function TlaCookieConsent() {
	const { addDialog, dialogs } = useDialogs()
	const isManageCookiesDialogShown = useValue(
		'isManageCookiesDialogShown',
		() => dialogs.get().some((d) => d.id === MANAGE_COOKIES_DIALOG),
		[dialogs]
	)
	const [consent, updateConsent] = useAnalyticsConsent()
	const [requiresConsent, setRequiresConsent] = useState<ConsentCheckResult | null>(null)
	const [animationComplete, setAnimationComplete] = useState(false)

	// Check if consent is required based on user's location
	useEffect(() => {
		if (consent !== null) return

		shouldRequireConsent().then((value: ConsentCheckResult) => {
			setRequiresConsent(value)

			// Only update consent if it's not required
			if (value === 'no-consent-needed') {
				updateConsent(true /* opted-in b/c region doesn't require explicit consent */)
			}
		})
	}, [consent, updateConsent])

	// Enable pointer events after animation nearly completes
	useEffect(() => {
		if (requiresConsent !== 'requires-consent') return

		const timer = setTimeout(() => {
			setAnimationComplete(true)
		}, 3000)

		return () => clearTimeout(timer)
	}, [requiresConsent])

	const handleAccept = useCallback(() => {
		updateConsent(true)
	}, [updateConsent])

	const handleReject = useCallback(() => {
		updateConsent(false)
	}, [updateConsent])

	const handleCustomize = useCallback(() => {
		addDialog({
			component: () => <TlaManageCookiesDialog />,
			id: MANAGE_COOKIES_DIALOG,
		})
	}, [addDialog])

	// Don't show banner if:
	if (
		// - User has already made a consent choice
		consent !== null ||
		// - We haven't determined if consent is required yet
		requiresConsent === null ||
		// - Consent is not required in user's region
		requiresConsent === 'no-consent-needed'
	)
		return null

	return (
		<div
			className={styles.cookieConsentWrapper}
			style={{
				opacity: isManageCookiesDialogShown ? 0 : 1,
				pointerEvents: animationComplete ? 'auto' : 'none',
			}} // If the manage cookies dialog is shown, hide the cookie consent banner but don't remove it or else the animation will replay when it reappears
		>
			<div className={styles.cookieConsent} data-testid="tla-cookie-consent">
				<p className={styles.cookieText}>
					<F defaultMessage="This site uses cookies to make the app work and to collect analytics." />
				</p>
				<div className={styles.cookieButtonsRow}>
					<button
						className={classNames('tla-button-text', styles.cookieButton, styles.hoverable)}
						onClick={handleReject}
					>
						<F defaultMessage="Opt out" />
					</button>
					<div className={styles.cookieButtons}>
						<button
							className={classNames('tla-button-text', styles.cookieButton, styles.hoverable)}
							onClick={handleCustomize}
						>
							<F defaultMessage="Settings" />
						</button>
						<button
							className={classNames(
								'tla-button-text',
								styles.cookieButton,
								styles.cookieAcceptButton,
								styles.hoverable
							)}
							onClick={handleAccept}
						>
							<div className={styles.cookieAcceptButtonTextWrapper}>
								<div className={styles.cookieAcceptButtonText}>
									<F defaultMessage="Accept all" />
								</div>
							</div>
						</button>
					</div>
				</div>
			</div>
		</div>
	)
})
