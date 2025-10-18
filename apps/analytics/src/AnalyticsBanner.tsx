import { useEffect } from 'react'
import { applyConsent, track } from './analytics'
import { useCookieConsent, writeConsentCookie } from './cookies'
import { useDocumentTheme } from './theme'
import type { CookieConsent } from './types'

export function AnalyticsBanner() {
	const theme = useDocumentTheme()
	const { consent, isLoaded, updateConsent } = useCookieConsent()

	useEffect(() => {
		applyConsent(consent)
	}, [consent])

	const onConsentChanged = (allowed: boolean) => {
		const nextConsent: CookieConsent = allowed ? 'opted-in' : 'opted-out'

		writeConsentCookie(nextConsent)
		updateConsent(nextConsent)
		track('consent_changed', { consent: allowed })
	}

	if (!isLoaded || consent !== 'unknown') return null

	return (
		<div className="tl-analytics-banner" data-theme={theme}>
			<p>
				We use cookies on this website.
				<br /> Learn more in our{' '}
				<a href="https://tldraw.notion.site/devcookiepolicy" target="_blank" rel="noreferrer">
					Cookie Policy
				</a>
				.
			</p>
			<div className="tl-analytics-buttons">
				<button
					className="tl-analytics-button tl-analytics-button-secondary"
					onClick={() => onConsentChanged(false)}
				>
					Opt out
				</button>
				<button
					className="tl-analytics-button tl-analytics-button-primary"
					onClick={() => onConsentChanged(true)}
				>
					<div className="tl-analytics-button-text-wrapper">
						<div className="tl-analytics-button-text">Accept all</div>
					</div>
				</button>
			</div>
		</div>
	)
}
