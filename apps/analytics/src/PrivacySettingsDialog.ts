import { DOT_DEV_COOKIE_POLICY_URL } from './constants'
import { cookieConsentState } from './cookie-consent'
import { documentThemeState } from './theme'

export function createPrivacySettingsDialog(): HTMLElement {
	cookieConsentState.initialize()
	const consent = cookieConsentState.getCurrentConsent()

	documentThemeState.initialize()
	const theme = documentThemeState.getCurrentTheme()

	// Create dialog container
	const dialogContainer = document.createElement('div')
	dialogContainer.className = 'tl-analytics-dialog-container'

	// Create overlay and dialog
	const overlay = document.createElement('div')
	overlay.className = 'tl-analytics-dialog'
	overlay.setAttribute('data-theme', theme)

	const dialogWrapper = document.createElement('div')
	dialogWrapper.className = 'tl-analytics-dialog-wrapper'
	dialogWrapper.setAttribute('data-theme', theme)

	const dialog = document.createElement('div')
	dialog.className = 'tl-analytics-dialog-content'

	// Create dialog content
	dialog.innerHTML = `
		<div class="tl-analytics-dialog-header">
			<h2 class="tl-analytics-dialog-title">Privacy settings</h2>
			<button class="tl-analytics-dialog-close" aria-label="Close">
				<svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
		<p class="tl-analytics-dialog-body">
			This website uses cookies to collect analytics from visitors. Read our 
				<a href="${DOT_DEV_COOKIE_POLICY_URL}" target="_blank" rel="noreferrer">cookie policy</a> 
				to learn more.
			</p>
		<div class="tl-analytics-checkbox-group">
			<label class="tl-analytics-checkbox-label" for="privacy-analytics">
				<strong>Analytics</strong> help us understand how people use this website so that we can make it better.
			</label>
			<div>
				<button class="tl-analytics-checkbox ${consent === 'opted-in' ? 'checked' : ''}" id="privacy-analytics" role="switch" aria-checked="${consent === 'opted-in'}">
					<span class="tl-analytics-checkbox-thumb"></span>
				</button>
			</div>
		</div>
	`

	// Add event listeners
	const closeButton = dialog.querySelector('.tl-analytics-dialog-close') as HTMLButtonElement
	const switchButton = dialog.querySelector('.tl-analytics-checkbox') as HTMLButtonElement

	function closeDialog() {
		dialogContainer.remove()
	}

	closeButton.addEventListener('click', closeDialog)

	// Close on overlay click
	overlay.addEventListener('click', closeDialog)

	// Prevent closing when clicking inside dialog
	dialog.addEventListener('click', (e: Event) => e.stopPropagation())

	// Handle ESC key
	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			closeDialog()
			document.removeEventListener('keydown', handleKeyDown)
		}
	}
	document.addEventListener('keydown', handleKeyDown)

	// Handle switch toggle
	switchButton.addEventListener('click', () => {
		const currentConsent = cookieConsentState.getCurrentConsent()
		const newConsent = currentConsent === 'opted-in' ? false : true
		cookieConsentState.setConsent(newConsent)
	})

	// Watch for consent changes
	const cleanupConsent = cookieConsentState.subscribe((consent) => {
		if (consent === 'opted-in') {
			switchButton.classList.add('checked')
			switchButton.setAttribute('aria-checked', 'true')
		} else {
			switchButton.classList.remove('checked')
			switchButton.setAttribute('aria-checked', 'false')
		}
	})

	// Watch for theme changes
	const cleanupTheme = documentThemeState.subscribe((theme) => {
		overlay.setAttribute('data-theme', theme)
		dialogWrapper.setAttribute('data-theme', theme)
	})

	// Clean up observer when dialog is removed
	const originalRemove = dialogContainer.remove.bind(dialogContainer)
	dialogContainer.remove = function () {
		document.removeEventListener('keydown', handleKeyDown)
		originalRemove()
		cleanupTheme()
		cleanupConsent()
	}

	// Assemble dialog
	dialogWrapper.appendChild(dialog)
	dialogContainer.appendChild(overlay)
	dialogContainer.appendChild(dialogWrapper)

	return dialogContainer
}

// Auto-mount function for easy integration
export function mountPrivacySettingsDialog(container: HTMLElement = document.body): HTMLElement {
	// If the dialog already exists, remove it
	const existingDialog = document.querySelector('.tl-analytics-dialog-container')
	if (existingDialog) existingDialog.remove()

	// Create dialog
	const dialog = createPrivacySettingsDialog()
	container.appendChild(dialog)
	return dialog
}
