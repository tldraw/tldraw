import { nicelog } from './nicelog'

/**
 * The PostHog project we send CI engineering metrics to. `phc_` keys are public, write-only
 * ingest keys, so keeping this in the repo is fine — it's the same project the e2e performance
 * reporter writes to. See https://eu.posthog.com/project/45972
 */
const CI_METRICS_API_KEY = 'phc_i8oKgMzgV38sn3GfjswW9mevQ3gFlo7bJXekZFeDN6'
const DEFAULT_API_HOST = 'https://analytics.tldraw.com/ingest'

export interface CiMetricEvent {
	event: string
	/**
	 * Groups a series together in PostHog. Use a stable string per metric (e.g.
	 * `dotcom-bundle-size`) rather than a per-run id, so a trend over time is one person's events
	 * instead of thousands of one-off people.
	 */
	distinctId: string
	properties: Record<string, unknown>
}

/**
 * Send events to the CI metrics PostHog project. Events are sent one at a time against the same
 * `/capture/` endpoint the e2e performance reporter uses.
 */
export async function captureCiMetricEvents(events: CiMetricEvent[]) {
	const apiHost = process.env.POSTHOG_API_HOST || DEFAULT_API_HOST
	const timestamp = new Date().toISOString()

	for (const { event, distinctId, properties } of events) {
		const response = await fetch(`${apiHost}/capture/`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				api_key: CI_METRICS_API_KEY,
				event,
				properties: {
					...properties,
					distinct_id: distinctId,
					$lib: 'tldraw-ci-metrics',
					$lib_version: '1.0.0',
				},
				timestamp,
			}),
		})

		if (!response.ok) {
			throw new Error(`PostHog API error: ${response.status} ${response.statusText}`)
		}
	}

	nicelog(`Sent ${events.length} event(s) to PostHog`)
}
