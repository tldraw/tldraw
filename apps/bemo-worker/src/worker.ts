/// <reference no-default-lib="true"/>
/// <reference types="@cloudflare/workers-types" />

import {
	createSentry,
	handleUserAssetGet,
	handleUserAssetUpload,
	notFound,
} from '@tldraw/worker-shared'
import { WorkerEntrypoint } from 'cloudflare:workers'
import { Router, createCors } from 'itty-router'
import { Environment } from './types'

export { BemoDO } from './BemoDO'

const cors = createCors({ origins: ['*'] })

export default class Worker extends WorkerEntrypoint<Environment> {
	private readonly router = Router()
		.all('*', cors.preflight)
		.get('/v1/uploads/:objectName', (request) => {
			return handleUserAssetGet({
				request,
				bucket: this.env.BEMO_BUCKET,
				objectName: `asset-uploads/${request.params.objectName}`,
				context: this.ctx,
			})
		})
		.post('/v1/uploads/:objectName', async (request) => {
			return handleUserAssetUpload({
				request,
				bucket: this.env.BEMO_BUCKET,
				objectName: `asset-uploads/${request.params.objectName}`,
				context: this.ctx,
			})
		})
		.get('/do', async (request) => {
			const bemo = this.env.BEMO_DO.get(this.env.BEMO_DO.idFromName('bemo-do'))
			const message = await (await bemo.fetch(request)).json()
			return Response.json(message)
		})
		.all('*', notFound)

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
