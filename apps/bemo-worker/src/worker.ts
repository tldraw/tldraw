/// <reference no-default-lib="true"/>
/// <reference types="@cloudflare/workers-types" />

import {
	handleApiRequest,
	handleExtractBookmarkMetadataRequest,
	handleUserAssetGet,
	handleUserAssetUpload,
	notFound,
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
				headers: request.headers,
				body: request.body,
				bucket: this.env.BEMO_BUCKET,
				objectName: `asset-uploads/${request.params.objectName}`,
			})
		})
		.get('/bookmarks/unfurl', (request) => {
			// legacy route: extract metadata without saving image
			return handleExtractBookmarkMetadataRequest({ request })
		})
		.post('/bookmarks/unfurl', (request) => {
			return handleExtractBookmarkMetadataRequest({
				request,
				uploadImage: async (headers, body, objectName) => {
					const response = await handleUserAssetUpload({
						body,
						headers,
						bucket: this.env.BEMO_BUCKET,
						objectName: `bookmark-assets/${objectName}`,
					})
					if (!response.ok) throw new Error('Failed to upload image')

					const requestUrl = new URL(request.url)
					return `${requestUrl.origin}/bookmarks/assets/${objectName}`
				},
			})
		})
		.get('/bookmarks/assets/:objectName', (request) => {
			return handleUserAssetGet({
				request,
				bucket: this.env.BEMO_BUCKET,
				objectName: `bookmark-assets/${request.params.objectName}`,
				context: this.ctx,
			})
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
