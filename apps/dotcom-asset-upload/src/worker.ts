/// <reference no-default-lib="true"/>
/// <reference types="@cloudflare/workers-types" />

import {
	createRouter,
	handleApiRequest,
	handleUserAssetGet,
	handleUserAssetUpload,
	notFound,
} from '@tldraw/worker-shared'
import { WorkerEntrypoint } from 'cloudflare:workers'
import { createCors } from 'itty-cors'
import { Environment } from './types'

const { preflight, corsify } = createCors({ origins: ['*'] })

export default class Worker extends WorkerEntrypoint<Environment> {
	readonly router = createRouter<Environment>()
		.all('*', preflight)
		.get('/uploads/:objectName', async (request) => {
			return handleUserAssetGet({
				request,
				bucket: this.env.UPLOADS,
				objectName: request.params.objectName,
				context: this.ctx,
			})
		})
		.post('/uploads/:objectName', async (request) => {
			return handleUserAssetUpload({
				request,
				bucket: this.env.UPLOADS,
				objectName: request.params.objectName,
				context: this.ctx,
			})
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
