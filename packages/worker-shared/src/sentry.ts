import { WorkerVersionMetadata } from '@cloudflare/workers-types'
import { Toucan } from 'toucan-js'

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
 * Returns null when the Sentry environment is not fully configured, allowing for graceful
 * degradation during local development and on misconfigured deployments. Callers should fall back
 * to `console.error` when they get null back.
 *
 * @param ctx - Execution context providing waitUntil for async operations
 * @param env - Environment variables containing Sentry configuration
 * @param request - Optional HTTP request for additional context in error reports
 * @returns Configured Toucan Sentry client instance, or null when Sentry is not configured
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
	const { SENTRY_DSN, WORKER_NAME, CF_VERSION_METADATA } = env

	if (!SENTRY_DSN || !WORKER_NAME || !CF_VERSION_METADATA) {
		// Every caller reaches this from a catch block or a durable object constructor, so throwing
		// on missing config replaces the error we were asked to report with a config error. In
		// handleApiRequest it was worse than that: the throw escaped the catch, discarding the 500
		// that had already been built and crashing the worker instead. Degrade to null so callers
		// fall back to console.error, and name the missing vars so the misconfiguration is still
		// diagnosable from the logs.
		if (env.TLDRAW_ENV !== 'development') {
			const missing = [
				!SENTRY_DSN && 'SENTRY_DSN',
				!WORKER_NAME && 'WORKER_NAME',
				!CF_VERSION_METADATA && 'CF_VERSION_METADATA',
			].filter(Boolean)
			console.error(
				`Sentry is not configured, errors will not be reported. Missing: ${missing.join(', ')}`
			)
		}
		return null
	}

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
