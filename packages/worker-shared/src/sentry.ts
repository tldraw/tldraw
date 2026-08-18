import { WorkerVersionMetadata } from '@cloudflare/workers-types'
import { Toucan } from 'toucan-js'
import { requiredEnv } from './env'

interface Context {
	waitUntil: ExecutionContext['waitUntil']
	request?: Request
}

/**
 * Environment interface that defines the required configuration for Sentry integration.
 * Workers environment interfaces should extend this interface to enable automatic
 * error tracking and reporting through the Sentry service.
 *
 * @example
 * ```ts
 * interface MyWorkerEnv extends SentryEnvironment {
 *   DATABASE_URL: string
 *   ASSETS_BUCKET: R2Bucket
 * }
 *
 * const router = createRouter<MyWorkerEnv>()
 * ```
 *
 * @public
 */
export interface SentryEnvironment {
	readonly SENTRY_DSN?: string | undefined
	readonly TLDRAW_ENV?: string | undefined
	readonly WORKER_NAME?: string | undefined
	readonly CF_VERSION_METADATA?: WorkerVersionMetadata
}

/**
 * Creates a configured Sentry client for error tracking in Cloudflare Workers.
 * Automatically configures Sentry with proper release tracking, environment context,
 * and request metadata for comprehensive error reporting.
 *
 * Returns null in development environment when SENTRY_DSN is not configured,
 * allowing for graceful degradation during local development.
 *
 * @param ctx - Execution context providing waitUntil for async operations
 * @param env - Environment variables containing Sentry configuration
 * @param request - Optional HTTP request for additional context in error reports
 * @returns Configured Toucan Sentry client instance, or null in development without DSN
 * @throws Error if required environment variables are missing in production
 *
 * @example
 * ```ts
 * export default {
 *   async fetch(request: Request, env: Env, ctx: ExecutionContext) {
 *     const sentry = createSentry(ctx, env, request)
 *
 *     try {
 *       // Your worker logic
 *       return Response.json({ success: true })
 *     } catch (error) {
 *       sentry?.captureException(error)
 *       throw error
 *     }
 *   }
 * }
 * ```
 *
 * @public
 */
export function createSentry(ctx: Context, env: SentryEnvironment, request?: Request) {
	if (!env.SENTRY_DSN && env.TLDRAW_ENV === 'development') {
		return null
	}

	const { SENTRY_DSN, WORKER_NAME, CF_VERSION_METADATA } = requiredEnv(env, {
		SENTRY_DSN: true,
		WORKER_NAME: true,
		CF_VERSION_METADATA: true,
	})

	return new Toucan({
		dsn: SENTRY_DSN,
		release: `${WORKER_NAME}.${CF_VERSION_METADATA.id}`,
		environment: WORKER_NAME,
		context: ctx,
		request,
		requestDataOptions: {
			allowedHeaders: ['user-agent'],
			allowedSearchParams: /(.*)/,
		},
	})
}
