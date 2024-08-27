import { AnalyticsEngineDataset } from '@cloudflare/workers-types'
import { BemoDO } from './BemoDO'

export interface Environment {
	// bindings
	BEMO_DO: DurableObjectNamespace<BemoDO>
	BEMO_BUCKET: R2Bucket
	CF_VERSION_METADATA: WorkerVersionMetadata

	// environment variables
	TLDRAW_ENV: string | undefined
	SENTRY_DSN: string | undefined
	IS_LOCAL: string | undefined
	WORKER_NAME: string | undefined

	BEMO_ANALYTICS?: AnalyticsEngineDataset
}
