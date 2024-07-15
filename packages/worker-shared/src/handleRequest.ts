import { T } from '@tldraw/validate'
import { IRequest, RouteHandler, Router, RouterType, StatusError } from 'itty-router'
import { SentryEnvironment, createSentry } from './sentry'

export type ApiRoute<Env extends SentryEnvironment, Ctx extends ExecutionContext> = (
	path: string,
	...handlers: RouteHandler<IRequest, [env: Env, ctx: Ctx]>[]
) => RouterType<ApiRoute<Env, Ctx>, [env: Env, ctx: Ctx]>

export type ApiRouter<Env extends SentryEnvironment, Ctx extends ExecutionContext> = RouterType<
	ApiRoute<Env, Ctx>,
	[env: Env, ctx: Ctx]
>

export function createRouter<
	Env extends SentryEnvironment,
	Ctx extends ExecutionContext = ExecutionContext,
>() {
	const router: ApiRouter<Env, Ctx> = Router()
	return router
}

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
	after: (response: Response) => Response | Promise<Response>
}) {
	let response
	try {
		response = await router.handle(request, env, ctx)
	} catch (error: any) {
		if (error instanceof StatusError) {
			console.error(`${error.status}: ${error.stack}`)
			response = Response.json({ error: error.message }, { status: error.status })
		} else {
			response = Response.json({ error: 'Internal server error' }, { status: 500 })
			console.error(error.stack ?? error)
			// eslint-disable-next-line deprecation/deprecation
			createSentry(ctx, env, request)?.captureException(error)
		}
	}

	try {
		return await after(response)
	} catch (error: any) {
		console.error(error.stack ?? error)
		// eslint-disable-next-line deprecation/deprecation
		createSentry(ctx, env, request)?.captureException(error)
		return Response.json({ error: 'Internal server error' }, { status: 500 })
	}
}

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
