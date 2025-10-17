import { Properties } from 'posthog-js'

export interface AnalyticsOptions {
	optedIn: boolean
	user?: {
		id: string
		name: string
		email: string
	}
}

export interface AnalyticsClient {
	configure(options: AnalyticsOptions): void
	trackEvent(name: string, data?: Properties): void
	isConfigured(): boolean
}

export interface EventBuffer {
	name: string
	data: Properties | null | undefined
}

export class EventBufferManager {
	private buffer: EventBuffer[] = []
	private isBuffering = true

	add(name: string, data?: Properties) {
		if (this.isBuffering) {
			this.buffer.push({ name, data })
		}
	}

	flush(callback: (event: EventBuffer) => void) {
		this.buffer.forEach(callback)
		this.buffer = []
		this.isBuffering = false
	}

	reset() {
		this.buffer = []
		this.isBuffering = true
	}
}

const PROPERTIES_TO_REDACT = ['url', 'href', 'pathname']

export function filterProperties(value: { [key: string]: any }) {
	return Object.entries(value).reduce<{ [key: string]: any }>((acc, [key, value]) => {
		if (PROPERTIES_TO_REDACT.some((prop) => key.includes(prop))) {
			acc[key] = 'redacted'
		} else {
			acc[key] = value
		}
		return acc
	}, {})
}
