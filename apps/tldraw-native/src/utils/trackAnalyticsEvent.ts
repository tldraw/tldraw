import va from '@vercel/analytics'

export function trackAnalyticsEvent(name: string, data: { [key: string]: any }) {
	va.track(name, data)
}
