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
	BEMO_DO: DurableObjectNamespace
	MEASURE: Analytics | undefined

	DATA: R2Bucket

	TLDRAW_ENV: string | undefined
	SENTRY_DSN: string | undefined
	IS_LOCAL: string | undefined
	WORKER_NAME: string | undefined
}
