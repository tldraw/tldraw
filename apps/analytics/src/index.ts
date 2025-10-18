import { applyConsent, gtag, identify, page, track } from './analytics'
import { mountCookieConsentBanner } from './components/CookieConsentBanner'
import { mountPrivacySettingsDialog } from './components/PrivacySettingsDialog'
import { cookieConsentState } from './state/cookie-consent-state'
import styles from './styles.css?inline'

// Inject styles
const style = document.createElement('style')
style.textContent = styles
document.head.appendChild(style)

// Initialize the cookie consent banner
mountCookieConsentBanner()

// Apply the initial analytics consent to the analytics services
const consent = cookieConsentState.getValue()
applyConsent(consent)

// Subscribe to consent changes and apply them to the analytics services
cookieConsentState.subscribe((consent) => {
	applyConsent(consent)
})

// Expose the global function to open privacy settings
window.tlanalytics = {
	openPrivacySettings: () => {
		mountPrivacySettingsDialog()
	},
	page,
	identify,
	track,
	gtag,
}
