/// <reference no-default-lib="true"/>
/// <reference types="@cloudflare/workers-types" />

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Router, createCors } from 'itty-router'
import { createSentry } from './sentry'
import { Environment } from './types'

export { BemoDO } from './BemoDO'

const cors = createCors({ origins: ['*'] })

export default class Worker extends WorkerEntrypoint<Environment> {
	private readonly router = Router()
		.all('*', cors.preflight)
		.get('/do', async (request) => {
			const bemo = this.env.BEMO_DO.get(this.env.BEMO_DO.idFromName('bemo-do'))
			const message = await (await bemo.fetch(request)).json()
			return Response.json(message)
		})
		.all('*', async () => new Response('Not found', { status: 404 }))

	override async fetch(request: Request): Promise<Response> {
		try {
			return await this.router.handle(request).then(cors.corsify)
		} catch (error) {
			const sentry = createSentry(this.ctx, this.env, request)
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
