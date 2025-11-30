import { DOT_DEV_COOKIE_POLICY_URL } from '../constants'
import { CookieConsentState } from '../state/cookie-consent-state'
import { ThemeState } from '../state/theme-state'

export function createCookieConsentBanner(
	cookieConsentState: CookieConsentState,
	themeState: ThemeState
): HTMLElement | null {
	const consent = cookieConsentState.getValue()
	const theme = themeState.getValue()

	// Don't show banner if consent is already given
	if (consent !== 'unknown') return null

	// Create banner element
	const banner = document.createElement('div')
	banner.className = 'tl-analytics-banner'
	banner.setAttribute('data-theme', theme)

	// Enable pointer events after animation completes
	setTimeout(() => {
		banner.style.pointerEvents = 'auto'
	}, 3000)

	// Create content
	banner.innerHTML = `
		<p class="tl-analytics-banner__text">
			We use cookies on this website.
			<br>
			Learn more in our <a class="tl-analytics-banner__link" href="${DOT_DEV_COOKIE_POLICY_URL}" target="_blank" rel="noreferrer">Cookie Policy</a>.
		</p>
		<div class="tl-analytics-banner__buttons">
			<button class="tl-analytics-button tl-analytics-button--secondary" data-action="opt-out">
				Opt out
			</button>
			<button class="tl-analytics-button tl-analytics-button--primary" data-action="accept">
				<div class="tl-analytics-button__text-wrapper">
					<div class="tl-analytics-button__text">Accept all</div>
				</div>
			</button>
		</div>
	`

	// Add event listeners
	banner.addEventListener('click', (e: Event) => {
		const target = e.target as HTMLElement
		const action = target.closest('[data-action]')?.getAttribute('data-action')
		if (action === 'opt-out') {
			cookieConsentState.setValue('opted-out')
		} else if (action === 'accept') {
			cookieConsentState.setValue('opted-in')
		}
	})

	const consentCleanup = cookieConsentState.subscribe((consent) => {
		if (consent !== 'unknown') {
			banner.remove()
		}
	})

	// Watch for theme changes
	const themeCleanup = themeState.subscribe((theme) => {
		banner.setAttribute('data-theme', theme)
	})

	// Clean up observer when banner is removed
	const originalRemove = banner.remove.bind(banner)
	banner.remove = function () {
		originalRemove()
		themeCleanup()
		consentCleanup()
	}

	return banner
}

// Auto-mount function for easy integration
export function mountCookieConsentBanner(
	cookieConsentState: CookieConsentState,
	themeState: ThemeState,
	container: HTMLElement
): HTMLElement | null {
	const existingBanner = document.querySelector('.tl-analytics-banner')
	if (existingBanner) existingBanner.remove()

	const banner = createCookieConsentBanner(cookieConsentState, themeState)
	if (banner) container.appendChild(banner)

	return banner
}
