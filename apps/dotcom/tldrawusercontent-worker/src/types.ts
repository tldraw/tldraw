import { R2Bucket, WorkerVersionMetadata } from '@cloudflare/workers-types'

interface SyncWorkerRpc {
	validateUpload(
		fileId: string,
		authorizationHeader: string | null
	): Promise<{ ok: true; userId: string | null } | { ok: false; error: string }>
	confirmUpload(objectName: string, fileId: string, userId: string | null): Promise<void>
}

export interface Environment {
	// bindings
	UPLOADS: R2Bucket
	CF_VERSION_METADATA: WorkerVersionMetadata
	SYNC_WORKER: SyncWorkerRpc

	// environment variables
	SENTRY_DSN: string | undefined
	TLDRAW_ENV: string | undefined
	IS_LOCAL: string | undefined
	WORKER_NAME: string | undefined
}
