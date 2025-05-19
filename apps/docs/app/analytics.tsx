'use client'

import Script from 'next/script'

export default function Analytics() {
	return (
		<Script
			id="tldraw-analytics"
			type="text/javascript"
			strategy="afterInteractive"
			async
			defer
			src="https://analytics.tldraw.com/tl-analytics.js"
		/>
	)
}

declare global {
	interface Window {
		tlanalytics: {
			openPrivacySettings(): void
		}
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
