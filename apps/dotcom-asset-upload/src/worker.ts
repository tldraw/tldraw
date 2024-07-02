/// <reference no-default-lib="true"/>
/// <reference types="@cloudflare/workers-types" />

import {
	createSentry,
	handleUserAssetGet,
	handleUserAssetUpload,
	notFound,
} from '@tldraw/worker-shared'
import { WorkerEntrypoint } from 'cloudflare:workers'
import { createCors } from 'itty-cors'
import { Router } from 'itty-router'
import { Environment } from './types'

const { preflight, corsify } = createCors({ origins: ['*'] })

export default class Worker extends WorkerEntrypoint<Environment> {
	readonly router = Router()
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
		try {
			return await this.router.handle(request, this.env, this.ctx).then(corsify)
		} catch (error) {
			const sentry = createSentry(this.ctx, this.env, request)
			console.error(error)
			// eslint-disable-next-line deprecation/deprecation
			sentry?.captureException(error)
			return new Response('Something went wrong', {
				status: 500,
				statusText: 'Internal Server Error',
			})
		}
	}
}
