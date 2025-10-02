import Cookies from 'js-cookie'
import posthog from 'posthog-js'
import { Dialog as _Dialog, Switch as _Switch } from 'radix-ui'
import { useEffect, useState } from 'react'
import ReactGA from 'react-ga4'
import './styles.css'

type CookieConsent = 'unknown' | 'opted-in' | 'opted-out'
let isConfigured = false
let storedUserId: string = ''
let storedProperties: { [key: string]: any } | undefined = undefined
let storedHasConsent: CookieConsent = 'unknown'
window.posthog = posthog

// Add theme detection
function getTheme() {
	const html = document.documentElement
	const colorScheme = html.getAttribute('style')?.includes('color-scheme: dark') ? 'dark' : 'light'
	return colorScheme
}

export default function Analytics() {
	const [isLoaded, setIsLoaded] = useState(false)
	const [hasConsent, setHasConsent] = useState<CookieConsent>('unknown')
	const [theme, setTheme] = useState<'light' | 'dark'>(getTheme())

	// Add theme observer
	useEffect(() => {
		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (mutation.attributeName === 'style') {
					setTheme(getTheme())
				}
			})
		})

		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['style'],
		})

		return () => observer.disconnect()
	}, [])

	const onConsentChanged = (hasConsent: boolean) => {
		Cookies.set('allowTracking', hasConsent ? 'true' : 'false')
		setHasConsent(hasConsent ? 'opted-in' : 'opted-out')
	}

	useEffect(() => {
		const consent = Cookies.get('allowTracking')
		setHasConsent(consent === 'true' ? 'opted-in' : consent === 'false' ? 'opted-out' : 'unknown')
		setIsLoaded(true)
	}, [])

	useEffect(() => {
		if (!isConfigured) {
			posthog.init('phc_i8oKgMzgV38sn3GfjswW9mevQ3gFlo7bJXekZFeDN6', {
				api_host: 'https://analytics.tldraw.com/i',
				ui_host: 'https://eu.i.posthog.com',
				persistence: 'memory',
				capture_pageview: 'history_change',
			})

			if (window.TL_GA4_MEASUREMENT_ID) {
				ReactGA.gtag('consent', 'default', {
					ad_storage: 'denied',
					ad_user_data: 'denied',
					ad_personalization: 'denied',
					analytics_storage: 'denied',
					// Wait for our cookie to load.
					wait_for_update: 500,
				})
				ReactGA.initialize(window.TL_GA4_MEASUREMENT_ID, {
					gaOptions: {
						anonymize_ip: true,
					},
				})

				// Add Google Ads configuration if present
				if (window.TL_GOOGLE_ADS_ID) {
					ReactGA.gtag('config', window.TL_GOOGLE_ADS_ID)
				}
			}

			isConfigured = true
		}

		storedHasConsent = hasConsent
		if (hasConsent === 'opted-in') {
			posthog.set_config({ persistence: 'localStorage+cookie' })
			posthog.opt_in_capturing()
			ReactGA.set({ anonymize_ip: false })

			ReactGA.gtag('consent', 'update', {
				ad_user_data: 'granted',
				ad_personalization: 'granted',
				ad_storage: 'granted',
				analytics_storage: 'granted',
			})

			if (storedUserId && storedProperties) {
				identify(storedUserId, storedProperties)
			}

			// Add Hubspot analytics
			if (!document.getElementById('hs-script-loader')) {
				const hubspotScriptTag = document.createElement('script')
				hubspotScriptTag.id = 'hs-script-loader'
				hubspotScriptTag.src = `https://js-eu1.hs-scripts.com/145620695.js`
				hubspotScriptTag.defer = true
				document.head.appendChild(hubspotScriptTag)
			}

			// Add Reo analytics
			if (!document.getElementById('reo-script-loader')) {
				const reoId = '47839e47a5ed202'
				const reoScriptTag = document.createElement('script')
				reoScriptTag.id = 'reo-script-loader'
				reoScriptTag.src = `https://static.reo.dev/${reoId}/reo.js`
				reoScriptTag.defer = true
				reoScriptTag.onload = () => window.Reo.init({ clientID: reoId })
				document.head.appendChild(reoScriptTag)
			}
		} else {
			posthog.reset()
			posthog.set_config({ persistence: 'memory' })
			posthog.opt_out_capturing()
			ReactGA.reset()
			ReactGA.set({ anonymize_ip: true })
			ReactGA.gtag('consent', 'update', {
				ad_user_data: 'denied',
				ad_personalization: 'denied',
				ad_storage: 'denied',
				analytics_storage: 'denied',
			})
			window.Reo?.reset?.()
		}
	}, [hasConsent])

	if (!isLoaded || hasConsent !== 'unknown') return null

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
					Accept
				</button>
			</div>
		</div>
	)
}

export function page() {
	posthog.capture('$pageview')
	ReactGA.send('pageview')
}

export function identify(userId: string, properties?: { [key: string]: any }) {
	storedUserId = userId
	storedProperties = properties

	if (storedHasConsent !== 'opted-in') return

	posthog.identify(userId, properties)
	ReactGA.set({ userId })
	ReactGA.set(properties)
	window.Reo?.identify?.({
		...properties,
		userId,
		firstname: properties?.name || '',
		username: properties?.email || '',
		type: 'email',
	})
}

export function track(name: string, data?: { [key: string]: any }) {
	posthog.capture(name, data)
	ReactGA.event(name, data)
}

export function gtag(...args: any[]) {
	if (storedHasConsent !== 'opted-in') return
	// @ts-ignore - ReactGA.gtag accepts variable arguments
	ReactGA.gtag(...args)
}

export function PrivacySettings() {
	const hasConsent: CookieConsent =
		Cookies.get('allowTracking') === 'true' ? 'opted-in' : 'opted-out'
	const [isChecked, setIsChecked] = useState(hasConsent === 'opted-in')
	const [theme, setTheme] = useState<'light' | 'dark'>(getTheme())

	// Add theme observer
	useEffect(() => {
		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (mutation.attributeName === 'style') {
					setTheme(getTheme())
				}
			})
		})

		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['style'],
		})

		return () => observer.disconnect()
	}, [])

	const onChange = (checked: boolean) => {
		Cookies.set('allowTracking', checked ? 'true' : 'false')
		setIsChecked(checked)
	}

	const onHide = () => {
		// Need this for the settings to take effect on the consent banner.
		window.location.reload()
	}

	return (
		<_Dialog.Root open>
			<_Dialog.Portal>
				<_Dialog.Overlay className="tl-analytics-dialog" data-theme={theme} />
				<div className="tl-analytics-dialog-wrapper" data-theme={theme}>
					<_Dialog.Content
						onInteractOutside={onHide}
						onPointerDownOutside={onHide}
						onEscapeKeyDown={onHide}
						className="tl-analytics-dialog-content"
					>
						<_Dialog.Title className="tl-analytics-dialog-title">Privacy settings</_Dialog.Title>
						<_Dialog.Description className="tl-analytics-dialog-body">
							This website uses cookies to collect analytics from visitors. Read our{' '}
							<a href="https://tldraw.notion.site/devcookiepolicy" target="_blank" rel="noreferrer">
								cookie policy
							</a>{' '}
							to learn more.
						</_Dialog.Description>
						<_Dialog.Close className="tl-analytics-dialog-close" asChild>
							<button aria-label="Close" onClick={onHide}>
								<svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</_Dialog.Close>

						<div className="tl-analytics-checkbox-group">
							<label className="tl-analytics-checkbox-label" htmlFor="privacy-analytics">
								<strong>Analytics</strong>
								<br />
								Optional. Help us understand how people use this website so that we can make it
								better.
							</label>
							<div>
								<_Switch.Root
									className="tl-analytics-checkbox"
									id="privacy-analytics"
									checked={isChecked}
									onCheckedChange={onChange}
								>
									<_Switch.Thumb />
								</_Switch.Root>
							</div>
						</div>
					</_Dialog.Content>
				</div>
			</_Dialog.Portal>
		</_Dialog.Root>
	)
}
