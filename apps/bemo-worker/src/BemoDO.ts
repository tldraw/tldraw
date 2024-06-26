import { DurableObject } from 'cloudflare:workers'
import { AutoRouter } from 'itty-router'
import { Toucan } from 'toucan-js'
import { Environment } from './types'

export class BemoDO extends DurableObject<Environment> {
	private reportError(e: Error, request?: Request) {
		const sentry = new Toucan({
			dsn: this.env.SENTRY_DSN,
			release: this.env.CF_VERSION_METADATA.id,
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

	private readonly router = AutoRouter({
		catch: (error, request) => {
			this.reportError(error, request)
			return new Response('Something went wrong', {
				status: 500,
				statusText: 'Internal Server Error',
			})
		},
	})
		.get('/hello', async () => {
			return `hello from a durable object! here's my env: ${JSON.stringify(this.env, null, 2)}`
		})
		.get('/throw', async () => {
			this.doAnError()
		})

	private doAnError() {
		throw new Error('this is an error from a DO')
	}

	override fetch = this.router.fetch
}
