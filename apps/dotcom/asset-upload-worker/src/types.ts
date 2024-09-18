import { R2Bucket, WorkerVersionMetadata } from '@cloudflare/workers-types'

export interface Environment {
	// bindings
	UPLOADS: R2Bucket
	CF_VERSION_METADATA: WorkerVersionMetadata

	// environment variables
	TLDRAW_ENV: string | undefined
	SENTRY_DSN: string | undefined
	IS_LOCAL: string | undefined
	WORKER_NAME: string | undefined
}
