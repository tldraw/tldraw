/// <reference no-default-lib="true"/>
/// <reference types="@cloudflare/workers-types" />

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Router, createCors } from 'itty-router'
import { Toucan } from 'toucan-js'
import { Environment } from './types'

export { BemoDO } from './BemoDO'

const cors = createCors({ origins: ['*'] })

export default class Worker extends WorkerEntrypoint<Environment> {
	private readonly router = Router()
		.all('*', cors.preflight)
		.get('/do', async () => {
			const bemo = this.env.BEMO_DO.get(this.env.BEMO_DO.idFromName('bemo-do'))
			const message = (await bemo.fetch('/hello')).json()
			return Response.json(message)
		})
		.get('/do/error', async () => {
			const bemo = this.env.BEMO_DO.get(this.env.BEMO_DO.idFromName('bemo-do'))
			return Response.json((await bemo.fetch('/throw')).json())
		})
		.get('/error', async () => {
			throw new Error('error from worker')
		})
		.all('*', async () => new Response('Not found', { status: 404 }))

	override async fetch(request: Request): Promise<Response> {
		try {
			return await this.router.handle(request).then(cors.corsify)
		} catch (error) {
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
			console.error(error)
			// eslint-disable-next-line deprecation/deprecation
			sentry.captureException(error)
			return new Response('Something went wrong', {
				status: 500,
				statusText: 'Internal Server Error',
			})
		}
	}
}
