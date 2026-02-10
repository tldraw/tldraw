import { Fetcher, R2Bucket, WorkerVersionMetadata } from '@cloudflare/workers-types'

export interface Environment {
	// bindings
	UPLOADS: R2Bucket
	CF_VERSION_METADATA: WorkerVersionMetadata
	SYNC_WORKER: Fetcher

	// environment variables
	TLDRAW_ENV: string | undefined
	IS_LOCAL: string | undefined
	WORKER_NAME: string | undefined
}
