// https://developers.cloudflare.com/analytics/analytics-engine/

// This type isn't available in @cloudflare/workers-types yet
export interface Analytics {
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

	ROOM_SNAPSHOTS: R2Bucket
	SNAPSHOT_SLUG_TO_PARENT_SLUG: KVNamespace

	SLUG_TO_READONLY_SLUG: KVNamespace
	READONLY_SLUG_TO_SLUG: KVNamespace

	// env vars
	SUPABASE_URL: string | undefined
	SUPABASE_KEY: string | undefined

	APP_ORIGIN: string | undefined

	TLDRAW_ENV: string | undefined
	SENTRY_DSN: string | undefined
	IS_LOCAL: string | undefined
	WORKER_NAME: string | undefined
}
