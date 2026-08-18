import { fetch } from '@tldraw/utils'
import classNames from 'classnames'
import { memo, useCallback, useEffect, useState } from 'react'
import { useDialogs, useValue } from 'tldraw'
import { useAnalyticsConsent } from '../../hooks/useAnalyticsConsent'
import { F } from '../../utils/i18n'
import { TlaManageCookiesDialog } from './TlaManageCookiesDialog'
import styles from './dialogs.module.css'

const MANAGE_COOKIES_DIALOG = 'manageCookiesDialog'

// Asks the consent worker (which reads Cloudflare geolocation headers) whether this
// region needs explicit consent. Any failure falls back to requiring it.
async function shouldRequireConsent(): Promise<boolean> {
	try {
		const response = await fetch('https://consent.tldraw.xyz')
		if (response.ok) {
			const data = await response.json()
			// Worker returns { requires_consent: boolean, country_code: string }
			if (typeof data.requires_consent === 'boolean') {
				return data.requires_consent
			}
		}
	} catch (error) {
		console.warn('Consent check failed, defaulting to requiring consent:', error)
	}
	return true
}

export const TlaCookieConsent = memo(function TlaCookieConsent() {
	const { addDialog, dialogs } = useDialogs()
	const isManageCookiesDialogShown = useValue(
		'isManageCookiesDialogShown',
		() => dialogs.get().some((d) => d.id === MANAGE_COOKIES_DIALOG),
		[dialogs]
	)
	const [consent, updateConsent] = useAnalyticsConsent()
	const [requiresConsent, setRequiresConsent] = useState<boolean | null>(null)
	const [animationComplete, setAnimationComplete] = useState(false)

	useEffect(() => {
		if (consent !== null) return

		shouldRequireConsent().then((value) => {
			setRequiresConsent(value)
			if (!value) {
				updateConsent(true /* opted-in b/c region doesn't require explicit consent */)
			}
		})
	}, [consent, updateConsent])

	// Enable pointer events after animation nearly completes
	useEffect(() => {
		if (!requiresConsent) return

		const timer = setTimeout(() => {
			setAnimationComplete(true)
		}, 3000)

		return () => clearTimeout(timer)
	}, [requiresConsent])

	const handleCustomize = useCallback(() => {
		addDialog({
			component: () => <TlaManageCookiesDialog />,
			id: MANAGE_COOKIES_DIALOG,
		})
	}, [addDialog])

	if (consent !== null || !requiresConsent) return null

	return (
		// If the manage cookies dialog is shown, hide the cookie consent banner but don't remove it
		// or else the animation will replay when it reappears
		<div
			className={styles.cookieConsentWrapper}
			style={{
				opacity: isManageCookiesDialogShown ? 0 : 1,
				pointerEvents: animationComplete ? 'auto' : 'none',
			}}
		>
			<div className={styles.cookieConsent} data-testid="tla-cookie-consent">
				<p className={styles.cookieText}>
					<F defaultMessage="This site uses cookies to make the app work and to collect analytics." />
				</p>
				<div className={styles.cookieButtonsRow}>
					<button
						className={classNames('tla-button-text', styles.cookieButton, styles.hoverable)}
						onClick={() => updateConsent(false)}
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
							onClick={() => updateConsent(true)}
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
