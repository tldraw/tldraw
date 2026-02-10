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
			return handleUserAssetGet({
				request,
				bucket: this.env.UPLOADS,
				objectName,
				context: this.ctx,
			})
		})
		.post('/:objectName', async (request) => {
			const objectName = request.params.objectName
			const res = await handleUserAssetUpload({
				headers: request.headers,
				body: request.body,
				bucket: this.env.UPLOADS,
				objectName,
			})

			// For app file uploads, validate auth and queue DB association
			// via sync-worker RPC (only callable via service binding, not HTTP).
			const fileId = new URL(request.url).searchParams.get('fileId')
			if (res.status === 200 && fileId) {
				const authHeader = request.headers.get('Authorization')
				const result = await this.env.SYNC_WORKER.associateAsset(objectName, fileId, authHeader)
				if (!result.ok) {
					console.error('[tldrawfiles] associate-asset failed:', result.error)
				}
			}

			return res
		})
		.all('*', notFound)

	override async fetch(request: Request) {
		return handleApiRequest({
			router: this.router,
			request,
			env: this.env,
			ctx: this.ctx,
			after: corsify,
		})
	}
}
