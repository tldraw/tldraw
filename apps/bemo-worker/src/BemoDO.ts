import { DurableObject } from 'cloudflare:workers'
import { Router } from 'itty-router'
import { createSentry } from './sentry'
import { Environment } from './types'

export class BemoDO extends DurableObject<Environment> {
	private reportError(e: unknown, request?: Request) {
		const sentry = createSentry(this.ctx, this.env, request)
		console.error(e)
		// eslint-disable-next-line deprecation/deprecation
		sentry.captureException(e)
	}

	private readonly router = Router()
		.get('/do', async () => {
			return Response.json({ message: 'Hello from a durable object!' })
		})
		.get('/do/error', async () => {
			this.doAnError()
		})
		.all('*', async () => new Response('Not found', { status: 404 }))

	private doAnError() {
		throw new Error('this is an error from a DO')
	}

	override async fetch(request: Request<unknown, CfProperties<unknown>>): Promise<Response> {
		try {
			return await this.router.handle(request)
		} catch (error) {
			this.reportError(error, request)
			return new Response('Something went wrong', {
				status: 500,
				statusText: 'Internal Server Error',
			})
		}
	}
}
