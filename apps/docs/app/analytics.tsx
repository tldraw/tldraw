'use client'

import Script from 'next/script'
import { useEffect } from 'react'

export default function Analytics() {
	useEffect(() => {
		window.TL_GA4_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID
		window.TL_GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID
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
