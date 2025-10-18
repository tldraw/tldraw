import { DOT_DEV_COOKIE_POLICY_URL } from './constants'
import { useDocumentTheme } from './theme'
import { useCookieConsent } from './useCookieConsent'

export function CookieConsentBanner() {
	const theme = useDocumentTheme()
	const { consent, updateConsent } = useCookieConsent()

	if (consent !== 'unknown') return null

	return (
		<div className="tl-analytics-banner" data-theme={theme}>
			<p>
				We use cookies on this website.
				<br /> Learn more in our{' '}
				<a href={DOT_DEV_COOKIE_POLICY_URL} target="_blank" rel="noreferrer">
					Cookie Policy
				</a>
				.
			</p>
			<div className="tl-analytics-buttons">
				<button
					className="tl-analytics-button tl-analytics-button-secondary"
					onClick={() => updateConsent(false)}
				>
					Opt out
				</button>
				<button
					className="tl-analytics-button tl-analytics-button-primary"
					onClick={() => updateConsent(true)}
				>
					<div className="tl-analytics-button-text-wrapper">
						<div className="tl-analytics-button-text">Accept all</div>
					</div>
				</button>
			</div>
		</div>
	)
}
