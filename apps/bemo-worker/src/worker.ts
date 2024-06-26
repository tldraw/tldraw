/// <reference no-default-lib="true"/>
/// <reference types="@cloudflare/workers-types" />

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Router } from 'itty-router'
import { Environment } from './types'

export { BemoDO } from './BemoDO'

export default class Worker extends WorkerEntrypoint<Environment> {
	readonly router = Router()
		.get('/do', async () => {
			const bemo = this.env.BEMO_DO.get(this.env.BEMO_DO.idFromName('bemo-do'))
			const message = await bemo.hello()
			return new Response(message, { status: 200 })
		})
		.get('/do/error', async () => {
			const bemo = this.env.BEMO_DO.get(this.env.BEMO_DO.idFromName('bemo-do'))
			await bemo.throw()
			return new Response('should have thrown', { status: 200 })
		})
		.get('/do/caught', async () => {
			try {
				const bemo = this.env.BEMO_DO.get(this.env.BEMO_DO.idFromName('bemo-do'))
				await bemo.throw()
			} catch (err) {
				console.error('caught error:', err)
			}
			return new Response('should have thrown', { status: 200 })
		})
		.get('/console-error', async () => {
			console.log('hi there')
			console.error('console.error from worker')
			return new Response('console.error from worker', { status: 200 })
		})
		.get('/console-warning', async () => {
			console.log('hi there')
			console.warn('console.warn from worker')
			return new Response('console.warn from worker', { status: 200 })
		})
		.get('/error', async () => {
			console.log('hi there')
			throw new Error('error from worker')
		})
		.all('*', async () => {
			return new Response('Hello, world!', { status: 200 })
		})

	override async fetch(_request: Request<unknown, CfProperties<unknown>>): Promise<Response> {
		return this.router.handle(_request)
	}
}
