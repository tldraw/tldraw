import React from 'react'
import { createRoot } from 'react-dom/client'
import Analytics, { gtag, identify, page, PrivacySettings, track } from './analytics'
import styles from './styles.css?inline'

// Inject styles
const style = document.createElement('style')
style.textContent = styles
document.head.appendChild(style)

// Create a container for our analytics component
const container = document.createElement('div')
container.id = 'tl-analytics-root'
document.body.appendChild(container)

// Initialize the analytics component
const root = createRoot(container)
root.render(React.createElement(Analytics))

// Expose global functions
declare global {
	interface Window {
		tlanalytics: {
			openPrivacySettings(): void
			page(): void
			identify(userId: string, properties?: { [key: string]: any }): void
			track(name: string, data?: { [key: string]: any }): void
			gtag(...args: any[]): void
		}
		TL_GA4_MEASUREMENT_ID: string | undefined
		TL_GOOGLE_ADS_ID?: string
		Reo: any
		posthog: any
	}
}

// Create a container for the privacy settings dialog
const privacyContainer = document.createElement('div')
privacyContainer.id = 'tl-analytics-privacy-root'
document.body.appendChild(privacyContainer)

const privacyRoot = createRoot(privacyContainer)

// Expose the global function to open privacy settings
window.tlanalytics = {
	openPrivacySettings: () => {
		privacyRoot.render(React.createElement(PrivacySettings))
	},
	page,
	identify,
	track,
	gtag,
}
