import { gtag, identify, page, track } from './analytics'
import { mountCookieConsentBanner } from './CookieConsentBanner'
import { mountPrivacySettingsDialog } from './PrivacySettingsDialog'
import styles from './styles.css?inline'

// Inject styles
const style = document.createElement('style')
style.textContent = styles
document.head.appendChild(style)

// Initialize the cookie consent banner
mountCookieConsentBanner()

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
