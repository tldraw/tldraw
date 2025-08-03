'use client'

import Script from 'next/script'
import { useEffect } from 'react'

export default function Analytics() {
	useEffect(() => {
		window.TL_GA4_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID
		window.TL_GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID
	}, [])

	// Track page views manually using the proper page() function
	useEffect(() => {
		const handleAnalyticsLoaded = () => {
			// Send initial page view using the dedicated page() function
			if (window.tlanalytics && typeof window.tlanalytics.page === 'function') {
				window.tlanalytics.page()
			}
		}

		// Check if analytics is already loaded
		if (window.tlanalytics) {
			handleAnalyticsLoaded()
			return // No cleanup needed if already loaded
		}

		// Wait for analytics script to load
		const checkAnalytics = setInterval(() => {
			if (window.tlanalytics) {
				clearInterval(checkAnalytics)
				handleAnalyticsLoaded()
			}
		}, 100)

		return () => clearInterval(checkAnalytics)
	}, [])

	// Track route changes in Next.js
	useEffect(() => {
		const handleRouteChange = () => {
			if (window.tlanalytics && typeof window.tlanalytics.page === 'function') {
				window.tlanalytics.page()
			}
		}

		// Listen for Next.js route changes
		const handlePathnameChange = () => {
			// Use setTimeout to ensure the new page is rendered before tracking
			setTimeout(handleRouteChange, 0)
		}

		// Since this is Next.js App Router, we need to listen for navigation changes
		const originalPushState = history.pushState
		const originalReplaceState = history.replaceState

		history.pushState = function (...args) {
			originalPushState.apply(history, args)
			handlePathnameChange()
		}

		history.replaceState = function (...args) {
			originalReplaceState.apply(history, args)
			handlePathnameChange()
		}

		window.addEventListener('popstate', handlePathnameChange)

		return () => {
			history.pushState = originalPushState
			history.replaceState = originalReplaceState
			window.removeEventListener('popstate', handlePathnameChange)
		}
	}, [])

	useEffect(() => {
		const handleCopy = (copyEvent: ClipboardEvent) => {
			const isWithinCodeBlock = (copyEvent.target as HTMLElement | null)?.closest('pre, code')
			if (isWithinCodeBlock) {
				const copiedText = window.getSelection()?.toString() || ''
				const isInstall = copiedText.trim() === 'npm install tldraw'
				track('docs.copy.code-block', { isInstall })

				// Track Google Ads conversion for code block copies
				if (window.tlanalytics?.gtag) {
					window.tlanalytics.gtag('event', 'conversion', {
						send_to: 'AW-17268182782/qIuDCMnhl_EaEP6djqpA',
						value: 1.0,
						currency: 'USD',
					})
				}
			}
		}
		document.addEventListener('copy', handleCopy)
		return () => {
			document.removeEventListener('copy', handleCopy)
		}
	}, [])

	return (
		<>
			<Script
				id="tldraw-analytics"
				type="text/javascript"
				strategy="afterInteractive"
				async
				defer
				src="https://analytics.tldraw.com/tl-analytics.js"
			/>
		</>
	)
}

declare global {
	interface Window {
		tlanalytics: {
			openPrivacySettings(): void
			track(name: string, data?: { [key: string]: any }): void
			gtag(...args: any[]): void
			page(): void
		}
		TL_GA4_MEASUREMENT_ID: string | undefined
		TL_GOOGLE_ADS_ID?: string
		posthog: any
	}
}

export function PrivacySettingsLink() {
	const onCookieClick = () => window.tlanalytics.openPrivacySettings()

	return (
		<>
			<button onClick={onCookieClick} className="hover:text-zinc-800 dark:hover:text-zinc-200">
				Privacy settings
			</button>
		</>
	)
}

export function track(name: string, data?: { [key: string]: any }) {
	window.tlanalytics?.track(name, data)
}
