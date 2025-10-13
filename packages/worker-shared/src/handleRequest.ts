import { T } from '@tldraw/validate'
import { IRequest, RequestHandler, Router, RouterType, StatusError } from 'itty-router'
import { SentryEnvironment, createSentry } from './sentry'

/**
 * Type definition for API route handlers with typed environment and context.
 * Represents a function that creates typed routes for Cloudflare Workers with proper
 * environment and execution context constraints.
 *
 * @param path - The URL path pattern for the route (e.g., '/api/users/:id')
 * @param handlers - Variable number of request handlers for the route
 * @returns A router type configured with the specified environment and context types
 *
 * @example
 * ```ts
 * interface MyEnv extends SentryEnvironment {
 *   DATABASE_URL: string
 * }
 *
 * const getRoute: ApiRoute<MyEnv, ExecutionContext> = router.get
 * getRoute('/users/:id', async (request, env, ctx) => {
 *   // Handler implementation with typed env and ctx
 *   return Response.json({ userId: request.params.id })
 * })
 * ```
 *
 * @public
 */
export type ApiRoute<Env extends SentryEnvironment, Ctx extends ExecutionContext> = (
	path: string,
	...handlers: RequestHandler<IRequest, [env: Env, ctx: Ctx]>[]
) => RouterType<IRequest, [env: Env, ctx: Ctx]>

/**
 * Type definition for a configured API router with typed environment and context.
 * Represents a router instance that handles requests with specific environment
 * and execution context types for Cloudflare Workers.
 *
 * @example
 * ```ts
 * interface WorkerEnv extends SentryEnvironment {
 *   ASSETS_BUCKET: R2Bucket
 * }
 *
 * const router: ApiRouter<WorkerEnv, ExecutionContext> = createRouter()
 * router.get('/health', () => Response.json({ status: 'ok' }))
 * ```
 *
 * @public
 */
export type ApiRouter<Env extends SentryEnvironment, Ctx extends ExecutionContext> = RouterType<
	IRequest,
	[env: Env, ctx: Ctx]
>

/**
 * Creates a new type-safe API router for Cloudflare Workers.
 * The router provides type safety for environment variables and execution context,
 * enabling proper TypeScript inference for request handlers.
 *
 * @returns A configured router instance with type constraints
 *
 * @example
 * ```ts
 * interface MyEnv extends SentryEnvironment {
 *   DATABASE_URL: string
 *   ASSETS_BUCKET: R2Bucket
 * }
 *
 * const router = createRouter<MyEnv>()
 *
 * router.get('/api/users', async (request, env, ctx) => {
 *   // env.DATABASE_URL is properly typed as string
 *   // env.ASSETS_BUCKET is properly typed as R2Bucket
 *   return Response.json({ users: [] })
 * })
 * ```
 *
 * @public
 */
export function createRouter<
	Env extends SentryEnvironment,
	Ctx extends ExecutionContext = ExecutionContext,
>() {
	const router: ApiRouter<Env, Ctx> = Router()
	return router
}

/**
 * Handles API requests with comprehensive error handling and Sentry integration.
 * This function wraps router request handling with automatic error catching,
 * proper HTTP status code responses, and optional post-processing of responses.
 *
 * @param options - Configuration object for request handling
 *   - router - The configured API router to handle the request
 *   - request - The incoming HTTP request to process
 *   - env - Environment variables and bindings (R2, KV, etc.)
 *   - ctx - Execution context for the Worker request
 *   - after - Post-processing function for responses (e.g., adding CORS headers)
 * @returns Promise that resolves to the HTTP response
 *
 * @example
 * ```ts
 * export default {
 *   async fetch(request: Request, env: Env, ctx: ExecutionContext) {
 *     return handleApiRequest({
 *       router,
 *       request,
 *       env,
 *       ctx,
 *       after: (response) => {
 *         // Add CORS headers to all responses
 *         response.headers.set('Access-Control-Allow-Origin', '*')
 *         return response
 *       },
 *     })
 *   },
 * }
 * ```
 *
 * @public
 */
export async function handleApiRequest<
	Env extends SentryEnvironment,
	Ctx extends ExecutionContext,
>({
	router,
	request,
	env,
	ctx,
	after,
}: {
	router: ApiRouter<Env, Ctx>
	request: Request
	env: Env
	ctx: Ctx
	after(response: Response): Response | Promise<Response>
}) {
	let response
	try {
		response = await router.fetch(request, env, ctx)
	} catch (error: any) {
		if (error instanceof StatusError) {
			console.error(`${error.status}: ${error.stack}`)
			response = Response.json({ error: error.message }, { status: error.status })
		} else {
			response = Response.json({ error: 'Internal server error' }, { status: 500 })
			console.error(error.stack ?? error)
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			createSentry(ctx, env, request)?.captureException(error)
		}
	}

	try {
		return await after(response)
	} catch (error: any) {
		console.error(error.stack ?? error)
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		createSentry(ctx, env, request)?.captureException(error)
		return Response.json({ error: 'Internal server error' }, { status: 500 })
	}
}

/**
 * Parses and validates query parameters from an HTTP request.
 * Uses tldraw's validation system to ensure query parameters match the expected schema.
 * Automatically throws HTTP 400 errors for invalid parameters with descriptive messages.
 *
 * @param request - The incoming HTTP request containing query parameters
 * @param validator - A tldraw validator that defines the expected query parameter schema
 * @returns The validated and typed query parameters
 * @throws StatusError with 400 status for validation failures
 *
 * @example
 * ```ts
 * import { T } from '@tldraw/validate'
 *
 * const queryValidator = T.object({
 *   url: T.httpUrl,
 *   limit: T.number.optional(),
 *   format: T.literalEnum('json', 'xml').optional()
 * })
 *
 * router.get('/api/process', (request) => {
 *   const { url, limit, format } = parseRequestQuery(request, queryValidator)
 *   // url is guaranteed to be a valid HTTP URL string
 *   // limit is number | undefined
 *   // format is 'json' | 'xml' | undefined
 *   return Response.json({ processed: url, limit, format })
 * })
 * ```
 *
 * @public
 */
export function parseRequestQuery<Params>(request: IRequest, validator: T.Validator<Params>) {
	try {
		return validator.validate(request.query)
	} catch (err) {
		if (err instanceof T.ValidationError) {
			throw new StatusError(400, `Query parameters: ${err.message}`)
		}
		throw err
	}
}

/**
 * Parses and validates JSON body content from an HTTP request.
 * Automatically parses the request body as JSON and validates it against the provided schema.
 * Throws HTTP 400 errors for both JSON parsing failures and validation errors.
 *
 * @param request - The incoming HTTP request containing JSON body content
 * @param validator - A tldraw validator that defines the expected body schema
 * @returns Promise that resolves to the validated and typed request body
 * @throws StatusError with 400 status for parsing or validation failures
 *
 * @example
 * ```ts
 * import { T } from '@tldraw/validate'
 *
 * const bodyValidator = T.object({
 *   name: T.string,
 *   email: T.string,
 *   age: T.number.optional(),
 *   preferences: T.object({
 *     theme: T.literalEnum('light', 'dark'),
 *     notifications: T.boolean
 *   }).optional()
 * })
 *
 * router.post('/api/users', async (request) => {
 *   const userData = await parseRequestBody(request, bodyValidator)
 *   // userData.name is guaranteed to be a string
 *   // userData.email is guaranteed to be a string
 *   // userData.age is number | undefined
 *   // userData.preferences is typed object | undefined
 *
 *   return Response.json({ created: userData })
 * })
 * ```
 *
 * @public
 */
export async function parseRequestBody<Body>(request: IRequest, validator: T.Validator<Body>) {
	try {
		return validator.validate(await request.json())
	} catch (err) {
		if (err instanceof T.ValidationError) {
			throw new StatusError(400, `Body: ${err.message}`)
		}
		throw err
	}
}
