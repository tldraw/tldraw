/// <reference no-default-lib="true"/>
/// <reference types="@cloudflare/workers-types" />

import {
	getUrlMetadata,
	handleApiRequest,
	handleUserAssetGet,
	handleUserAssetUpload,
	notFound,
	parseRequestQuery,
	urlMetadataQueryValidator,
} from '@tldraw/worker-shared'
import { WorkerEntrypoint } from 'cloudflare:workers'
import { Router, cors } from 'itty-router'
import { Environment } from './types'

export { BemoDO } from './BemoDO'

const { preflight, corsify } = cors({ origin: '*' })

export default class Worker extends WorkerEntrypoint<Environment> {
	private readonly router = Router()
		.all('*', preflight)
		.get('/uploads/:objectName', (request) => {
			return handleUserAssetGet({
				request,
				bucket: this.env.BEMO_BUCKET,
				objectName: `asset-uploads/${request.params.objectName}`,
				context: this.ctx,
			})
		})
		.post('/uploads/:objectName', async (request) => {
			return handleUserAssetUpload({
				request,
				bucket: this.env.BEMO_BUCKET,
				objectName: `asset-uploads/${request.params.objectName}`,
				context: this.ctx,
			})
		})
		.get('/bookmarks/unfurl', async (request) => {
			const query = parseRequestQuery(request, urlMetadataQueryValidator)
			return Response.json(await getUrlMetadata(query))
		})
		.get('/connect/:slug', (request) => {
			const slug = request.params.slug
			if (!slug) return new Response('Not found', { status: 404 })

			// Set up the durable object for this room
			const id = this.env.BEMO_DO.idFromName(slug)
			return this.env.BEMO_DO.get(id).fetch(request)
		})
		.all('*', notFound)

	override async fetch(request: Request): Promise<Response> {
		return handleApiRequest({
			router: this.router,
			request,
			env: this.env,
			ctx: this.ctx,
			after: corsify,
		})
	}
}
