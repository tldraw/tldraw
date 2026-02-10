import { R2Bucket, WorkerVersionMetadata } from '@cloudflare/workers-types'

interface SyncWorkerRpc {
	associateAsset(
		objectName: string,
		fileId: string,
		authorizationHeader: string | null
	): Promise<{ ok: boolean; error?: string }>
}

export interface Environment {
	// bindings
	UPLOADS: R2Bucket
	CF_VERSION_METADATA: WorkerVersionMetadata
	SYNC_WORKER: SyncWorkerRpc

	// environment variables
	TLDRAW_ENV: string | undefined
	IS_LOCAL: string | undefined
	WORKER_NAME: string | undefined
}
