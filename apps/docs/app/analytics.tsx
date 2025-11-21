'use client'

import Script from 'next/script'
import { useEffect } from 'react'

export default function Analytics() {
	useEffect(() => {
		window.TL_GA4_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID
		window.TL_GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID
		window.TL_GTM_CONTAINER_ID = process.env.NEXT_PUBLIC_GTM_CONTAINER_ID
	}, [])

	useEffect(() => {
		const handleCopy = (copyEvent: ClipboardEvent) => {
			const isWithinCodeBlock = (copyEvent.target as HTMLElement | null)?.closest('pre, code')
			if (isWithinCodeBlock) {
				const copiedText = window.getSelection()?.toString() || ''

				if (window.tlanalytics?.trackCopyCode) {
					window.tlanalytics.trackCopyCode({
						page_category: 'docs',
						text_snippet: copiedText,
					})
				}

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

	const analyticsScriptSrc =
		process.env.NODE_ENV === 'development'
			? 'http://localhost:5173/tl-analytics.js'
			: 'https://analytics.tldraw.com/tl-analytics.js'

	return (
		<>
			<Script
				id="tldraw-analytics"
				type="text/javascript"
				strategy="afterInteractive"
				async
				defer
				src={analyticsScriptSrc}
			/>
		</>
	)
}

interface ConsentPreferences {
	analytics: 'granted' | 'denied'
	marketing: 'granted' | 'denied'
}

declare global {
	interface Window {
		tlanalytics: {
			openPrivacySettings(): void
			track(name: string, data?: { [key: string]: any }): void
			gtag(...args: any[]): void
			getConsentState(): ConsentPreferences
			onConsentUpdate(callback: (preferences: ConsentPreferences) => void): () => void
			trackCopyCode(data: {
				page_category: string
				text_snippet: string
				user_email?: string
				user_email_sha256?: string
				user_first_name?: string
				user_last_name?: string
				user_phone_number?: string
			}): void
			trackFormSubmission(data: {
				enquiry_type: string
				page_category?: string
				company_size?: string
				company_website?: string
				user_email?: string
				user_email_sha256?: string
				user_first_name?: string
				user_last_name?: string
				user_phone_number?: string
			}): void
		}
		TL_GA4_MEASUREMENT_ID: string | undefined
		TL_GOOGLE_ADS_ID?: string
		TL_GTM_CONTAINER_ID?: string
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
