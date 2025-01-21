import va from '@vercel/analytics'
import { trackPosthogEvent } from './posthog'

export function trackAnalyticsEvent(name: string, data?: { [key: string]: any }) {
	va.track(name, data)
	trackPosthogEvent(name, data)
}
