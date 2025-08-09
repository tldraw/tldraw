import { TLUiEventSource, useUiEvents } from 'tldraw'
import { openUrl } from '../utils/url'

/**
 * Hook for tracking transitions from tldraw.com to tldraw.dev
 * Uses existing open-url events with enhanced analytics data
 */
export function useComToDevTransitions() {
	const trackEvent = useUiEvents()

	const trackTransition = (source: TLUiEventSource, url: string, context?: string) => {
		// Parse UTM parameters from the URL for additional context
		const urlObj = new URL(url)
		const utm_source = urlObj.searchParams.get('utm_source')
		const utm_medium = urlObj.searchParams.get('utm_medium')
		const utm_campaign = urlObj.searchParams.get('utm_campaign')

		// Track using the existing 'open-url' event
		trackEvent('open-url', { source, url })

		// Log transition details for analytics (can be picked up by analytics.tsx)
		if (typeof window !== 'undefined' && url.includes('tldraw.dev')) {
			// Dispatch a custom event that analytics can listen to
			window.dispatchEvent(
				new CustomEvent('tldraw-com-to-dev-transition', {
					detail: {
						source,
						url,
						transition_type: 'com-to-dev',
						destination_domain: 'tldraw.dev',
						utm_source,
						utm_medium,
						utm_campaign,
						context,
						timestamp: Date.now(),
					},
				})
			)
		}
	}

	const openAndTrackTransition = (source: TLUiEventSource, url: string, context?: string) => {
		trackTransition(source, url, context)
		openUrl(url)
	}

	return {
		trackTransition,
		openAndTrackTransition,
	}
}

/**
 * Enhanced hook that wraps useOpenUrlAndTrack with additional .dev transition detection
 */
export function useOpenUrlAndTrackWithTransitions(source: TLUiEventSource) {
	const { openAndTrackTransition } = useComToDevTransitions()
	const trackEvent = useUiEvents()

	return (url: string, context?: string) => {
		// Check if this is a transition to tldraw.dev
		if (url.includes('tldraw.dev')) {
			openAndTrackTransition(source, url, context)
		} else {
			// Use standard tracking for other URLs
			trackEvent('open-url', { source, url })
			openUrl(url)
		}
	}
}
