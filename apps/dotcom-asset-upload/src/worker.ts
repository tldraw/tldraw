/// <reference no-default-lib="true"/>
/// <reference types="@cloudflare/workers-types" />

import { handleUserAssetGet, handleUserAssetUpload, notFound } from '@tldraw/worker-shared'
import { createCors } from 'itty-cors'
import { Router } from 'itty-router'

const { preflight, corsify } = createCors({ origins: ['*'] })

interface Env {
	UPLOADS: R2Bucket
}

const router = Router()

router
	.all('*', preflight)
	.get('/uploads/:objectName', async (request, env: Env, ctx: ExecutionContext) => {
		return handleUserAssetGet({
			request,
			bucket: env.UPLOADS,
			objectName: request.params.objectName,
			context: ctx,
		})
	})
	.post('/uploads/:objectName', async (request, env: Env, ctx: ExecutionContext) => {
		return handleUserAssetUpload({
			request,
			bucket: env.UPLOADS,
			objectName: request.params.objectName,
			context: ctx,
		})
	})
	.all('*', notFound)

const Worker = {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		return router
			.handle(request, env, ctx)
			.catch((err) => {
				// eslint-disable-next-line no-console
				console.log(err, err.stack)
				return new Response((err as Error).message, { status: 500 })
			})
			.then(corsify)
	},
}

export default Worker
