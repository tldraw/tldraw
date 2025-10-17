import posthog, { PostHogConfig, Properties } from 'posthog-js'
import 'posthog-js/dist/web-vitals'
import { warnOnce } from 'tldraw'
import { AnalyticsClient, AnalyticsOptions, EventBufferManager, filterProperties } from './shared'

// @ts-ignore this is fine
const POSTHOG_KEY: string | undefined = import.meta.env.VITE_POSTHOG_KEY
const shouldUsePosthog = POSTHOG_KEY !== undefined

export class PostHogClient implements AnalyticsClient {
	private currentOptions: AnalyticsOptions | null = null
	private eventBuffer = new EventBufferManager()

	configure(options: AnalyticsOptions) {
		if (!shouldUsePosthog) return

		const hashParams = new URLSearchParams(window.location.hash.substring(1))
		const sessionID = hashParams.get('session_id')
		const distinctID = hashParams.get('distinct_id')

		const config: Partial<PostHogConfig> = {
			api_host: 'https://analytics.tldraw.com/i',
			ui_host: 'https://eu.i.posthog.com',
			capture_pageview: false,
			persistence: options.optedIn ? 'localStorage+cookie' : 'memory',
			before_send: (payload) => {
				if (!payload) return null
				payload.properties.is_signed_in = !!options.user

				const redactedProperties = filterProperties(payload.properties || {})
				payload.properties = redactedProperties

				const redactedSet = filterProperties(payload.$set || {})
				payload.$set = redactedSet

				const redactedSetOnce = filterProperties(payload.$set_once || {})
				payload.$set_once = redactedSetOnce

				return payload
			},
			bootstrap:
				sessionID && distinctID
					? {
							sessionID,
							distinctID,
						}
					: undefined,
		}

		if (!this.currentOptions) {
			posthog.init(POSTHOG_KEY, config)
		}

		if (options.optedIn) {
			if (options.user) {
				posthog.identify(options.user.id, {
					email: options.user.email,
					name: options.user.name,
					analytics_consent: true,
				})
			}
		} else if (this.currentOptions?.optedIn) {
			posthog.setPersonProperties({ analytics_consent: false })
			posthog.reset()
		}

		posthog.set_config(config)
		this.currentOptions = options
		this.eventBuffer.flush((event) => posthog.capture(event.name, event.data))
	}

	trackEvent(name: string, data?: Properties) {
		if (!shouldUsePosthog) return

		if (!this.currentOptions) {
			warnOnce('PostHog trackEvent called before configure - buffering')
			this.eventBuffer.add(name, data)
			return
		}

		posthog.capture(name, data)
	}

	isConfigured(): boolean {
		return this.currentOptions !== null
	}
}

export const posthogClient = new PostHogClient()
