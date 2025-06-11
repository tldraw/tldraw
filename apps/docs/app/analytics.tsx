'use client'

import Script from 'next/script'
import { useEffect } from 'react'

export default function Analytics() {
	useEffect(() => {
		window.TL_GA4_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID
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

export function track(name: string, data?: { [key: string]: any }) {
	window.tlanalytics?.track(name, data)
}
