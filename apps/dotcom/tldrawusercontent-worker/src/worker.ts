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
		// Upload flow for app file assets:
		// 1. validateUpload — "file" = tldraw document record in postgres (not the asset blob).
		//    Checks the document exists and the user has write access (owner, shared-edit link, or group member).
		// 2. R2 upload — writes the asset blob to the R2 bucket.
		// 3. confirmUpload — queues a message to asynchronously insert an `asset` row
		//    linking the uploaded blob to the document.
		.post('/:objectName', async (request) => {
			const objectName = request.params.objectName
			const fileId = new URL(request.url).searchParams.get('fileId')

			// For app file uploads, validate auth + file access before writing to R2.
			let userId: string | null = null
			if (fileId) {
				const authHeader = request.headers.get('Authorization')
				const validation = await this.env.SYNC_WORKER.validateUpload(fileId, authHeader)
				if (!validation.ok) {
					const status = validation.error === 'File not found' ? 404 : 403
					return Response.json({ error: validation.error }, { status })
				}
				userId = validation.userId
			}

			const res = await handleUserAssetUpload({
				headers: request.headers,
				body: request.body,
				bucket: this.env.UPLOADS,
				objectName,
			})

			// Queue the DB association after successful upload.
			// Wrapped in try/catch so a transient sync-worker failure doesn't
			// turn a successful R2 upload into a 500. maybeAssociateFileAssets
			// will pick up the association later if this fails.
			if (res.status === 200 && fileId) {
				try {
					await this.env.SYNC_WORKER.confirmUpload(objectName, fileId, userId)
				} catch (e) {
					console.error('Failed to queue asset association', e)
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
