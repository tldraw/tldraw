import { Properties } from 'posthog-js'
import ReactGA from 'react-ga4'
import { warnOnce } from 'tldraw'
import { AnalyticsClient, AnalyticsOptions, EventBufferManager } from './shared'

// @ts-ignore this is fine
const GA4_MEASUREMENT_ID: string | undefined = import.meta.env.VITE_GA4_MEASUREMENT_ID
const shouldUseGA4 = GA4_MEASUREMENT_ID !== undefined

export class GA4Client implements AnalyticsClient {
	private currentOptions: AnalyticsOptions | null = null
	private eventBuffer = new EventBufferManager()

	configure(options: AnalyticsOptions) {
		if (!shouldUseGA4) return

		if (!this.currentOptions) {
			ReactGA.gtag('consent', 'default', {
				ad_storage: 'denied',
				ad_user_data: 'denied',
				ad_personalization: 'denied',
				analytics_storage: 'denied',
				wait_for_update: 500,
			})

			ReactGA.initialize(GA4_MEASUREMENT_ID, {
				gtagOptions: {
					send_page_view: false,
				},
			})
		}

		if (options.optedIn) {
			if (options.user) {
				ReactGA.set({ userId: options.user.id, anonymize_ip: false })
			}
			ReactGA.gtag('consent', 'update', {
				ad_user_data: 'granted',
				ad_personalization: 'granted',
				ad_storage: 'granted',
				analytics_storage: 'granted',
			})
		} else if (this.currentOptions?.optedIn) {
			ReactGA.set({ anonymize_ip: true })
			ReactGA.reset()

			ReactGA.gtag('consent', 'update', {
				ad_user_data: 'denied',
				ad_personalization: 'denied',
				ad_storage: 'denied',
				analytics_storage: 'denied',
			})
		}

		this.currentOptions = options
		this.eventBuffer.flush((event) => ReactGA.event(event.name, event.data ?? {}))
	}

	trackEvent(name: string, data?: Properties) {
		if (!shouldUseGA4) return
		if (name !== '$pageview') return

		const eventData = data ?? {}

		if (!this.currentOptions) {
			warnOnce('GA4 page view received before configure - buffering')
			this.eventBuffer.add('page_view', eventData)
			return
		}

		ReactGA.event('page_view', eventData)
	}

	isConfigured(): boolean {
		return this.currentOptions !== null
	}
}

export const ga4Client = new GA4Client()
