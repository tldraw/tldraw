/// <reference no-default-lib="true"/>
/// <reference types="@cloudflare/workers-types" />

import {
	blockUnknownOrigins,
	createRouter,
	handleApiRequest,
	handleUserAssetGet,
	handleUserAssetUpload,
	isAllowedOrigin,
	notFound,
} from '@tldraw/worker-shared'
import { WorkerEntrypoint } from 'cloudflare:workers'
import { cors } from 'itty-router'
import { Environment } from './types'

const { preflight, corsify } = cors({ origin: isAllowedOrigin })

export default class Worker extends WorkerEntrypoint<Environment> {
	readonly router = createRouter<Environment>()
		.all('*', preflight)
		.all('*', blockUnknownOrigins)
		.get('/:objectName', async (request) => {
			const objectName = request.params.objectName
			console.error('[tldrawfiles] GET', request.url, { objectName })
			const head = await this.env.UPLOADS.head(objectName)
			console.error('[tldrawfiles] R2 head result:', head ? 'found' : 'not found', { objectName })
			if (!head) {
				const list = await this.env.UPLOADS.list({ limit: 10 })
				console.error(
					'[tldrawfiles] R2 bucket sample:',
					list.objects.map((o) => o.key)
				)
			}
			return handleUserAssetGet({
				request,
				bucket: this.env.UPLOADS,
				objectName,
				context: this.ctx,
			})
		})
		.post('/:objectName', async (request) => {
			const objectName = request.params.objectName
			console.error('[tldrawfiles] POST', request.url, { objectName })
			const res = await handleUserAssetUpload({
				headers: request.headers,
				body: request.body,
				bucket: this.env.UPLOADS,
				objectName,
			})

			// For app file uploads, notify sync-worker to validate auth and
			// queue the DB association via service binding.
			const fileId = new URL(request.url).searchParams.get('fileId')
			if (res.status === 200 && fileId) {
				const associateUrl = new URL(request.url)
				associateUrl.pathname = `/app/associate-asset/${objectName}`
				const associateRes = await this.env.SYNC_WORKER.fetch(
					new Request(associateUrl.toString(), {
						method: 'POST',
						headers: request.headers,
					})
				)
				if (!associateRes.ok) {
					console.error('[tldrawfiles] associate-asset failed:', associateRes.status)
				}
			}

			return res
		})
		.all('*', notFound)

	override async fetch(request: Request) {
		console.error('[tldrawfiles] incoming request:', request.method, request.url)
		return handleApiRequest({
			router: this.router,
			request,
			env: this.env,
			ctx: this.ctx,
			after: corsify,
		})
	}
}
