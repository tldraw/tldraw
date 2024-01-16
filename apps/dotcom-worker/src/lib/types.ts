// https://developers.cloudflare.com/analytics/analytics-engine/

// This type isn't available in @cloudflare/workers-types yet
export type Analytics = {
	writeDataPoint(data: {
		blobs?: string[]
		doubles?: number[]
		indexes?: [string] // only one here
	}): void
}

export interface Environment {
	// bindings
	TLDR_DOC: DurableObjectNamespace
	MEASURE: Analytics | undefined

	ROOMS: R2Bucket
	ROOMS_HISTORY_EPHEMERAL: R2Bucket

	// env vars
	SUPABASE_URL: string | undefined
	SUPABASE_KEY: string | undefined

	APP_ORIGIN: string | undefined

	TLDRAW_ENV: string | undefined
	SENTRY_DSN: string | undefined
	IS_LOCAL: string | undefined
}
