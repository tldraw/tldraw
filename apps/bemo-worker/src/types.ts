import { BemoDO } from './BemoDO'

export interface Environment {
	// bindings
	BEMO_DO: DurableObjectNamespace<BemoDO>

	TLDRAW_ENV: string | undefined
	SENTRY_DSN: string | undefined
	IS_LOCAL: string | undefined
	WORKER_NAME: string | undefined
	CF_VERSION_METADATA: WorkerVersionMetadata
}
