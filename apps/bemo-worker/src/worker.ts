/// <reference no-default-lib="true"/>
/// <reference types="@cloudflare/workers-types" />

import { WorkerEntrypoint } from 'cloudflare:workers'
import { AutoRouter, cors } from 'itty-router'
import { Toucan } from 'toucan-js'
import { Environment } from './types'

export { BemoDO } from './BemoDO'

export default class Worker extends WorkerEntrypoint<Environment> {
	private readonly cors = cors()
	private readonly router = AutoRouter({
		before: [this.cors.preflight],
		finally: [this.cors.corsify],
		catch: (error, request) => {
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
			console.error(error)
			// eslint-disable-next-line deprecation/deprecation
			sentry.captureException(error)
			return new Response('Something went wrong', {
				status: 500,
				statusText: 'Internal Server Error',
			})
		},
	})
		.get('/do', async () => {
			const bemo = this.env.BEMO_DO.get(this.env.BEMO_DO.idFromName('bemo-do'))
			const message = (await bemo.fetch('/hello')).json()
			return message
		})
		.get('/do/error', async () => {
			const bemo = this.env.BEMO_DO.get(this.env.BEMO_DO.idFromName('bemo-do'))
			return (await bemo.fetch('/throw')).json()
		})
		.get('/error', async () => {
			throw new Error('error from worker')
		})

	override fetch = this.router.fetch
}
