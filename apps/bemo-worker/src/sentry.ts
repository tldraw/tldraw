import { Toucan } from 'toucan-js'
import { Environment } from './types'

interface Context {
	waitUntil: ExecutionContext['waitUntil']
	request?: Request
}

export function createSentry(ctx: Context, env: Environment, request?: Request) {
	return new Toucan({
		dsn: env.SENTRY_DSN,
		release: `${env.WORKER_NAME}.${env.CF_VERSION_METADATA.id}`,
		environment: env.WORKER_NAME,
		context: ctx,
		request,
		requestDataOptions: {
			allowedHeaders: ['user-agent'],
			allowedSearchParams: /(.*)/,
		},
	})
}
