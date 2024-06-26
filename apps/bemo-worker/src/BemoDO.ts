import { DurableObject } from 'cloudflare:workers'
import { Router } from 'itty-router'
import { Toucan } from 'toucan-js'
import { Environment } from './types'

export class BemoDO extends DurableObject<Environment> {
	private reportError(e: unknown, request?: Request) {
		const sentry = new Toucan({
			dsn: this.env.SENTRY_DSN,
			release: this.env.CF_VERSION_METADATA.id,
			environment: this.env.WORKER_NAME,
			context: this.ctx,
			request,
			requestDataOptions: {
				allowedHeaders: ['user-agent'],
				allowedSearchParams: /(.*)/,
			},
		})
		console.error(e)
		// eslint-disable-next-line deprecation/deprecation
		sentry.captureException(e)
	}

	private readonly router = Router()
		.get('/hello', async () => {
			return Response.json(
				`hello from a durable object! here's my env: ${JSON.stringify(this.env, null, 2)}`
			)
		})
		.get('/throw', async () => {
			this.doAnError()
		})

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
