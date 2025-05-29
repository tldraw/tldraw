'use client'

import { Analytics as VercelAnalytics } from '@vercel/analytics/react'
import Script from 'next/script'
import { useEffect } from 'react'

export default function Analytics() {
	useEffect(() => {
		window.TL_GA4_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID
	}, [])

	return (
		<>
			<VercelAnalytics />
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
		}
		TL_GA4_MEASUREMENT_ID: string | undefined
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
