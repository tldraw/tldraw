/// <reference no-default-lib="true"/>
/// <reference types="@cloudflare/workers-types" />

import { createRouter, notFound } from '@tldraw/worker-shared'
import { WorkerEntrypoint } from 'cloudflare:workers'
import { cors } from 'itty-router'
import { Environment } from './types'
export { STCoordinatorDO } from './STCoordinatorDO'
export { STWorkerDO } from './STWorkerDO'

const { preflight, corsify } = cors({ origin: '*' })

const router = createRouter()
	.all('*', (req) => preflight(req))
	.get('/state', async (req: Request, env: Environment) => {
		const bearer = req.headers.get('Authorization')
		if (!bearer || bearer !== `Bearer ${env.ACCESS_TOKEN}`) {
			return new Response('Unauthorized', { status: 401 })
		}
		const coordinator = env.ST_COORDINATOR.get(env.ST_COORDINATOR.idFromName('coordinator'))
		return coordinator.fetch(req)
	})
	.all('*', notFound)

export default class Worker extends WorkerEntrypoint<Environment> {
	override async fetch(request: Request): Promise<Response> {
		return router.fetch(request, this.env).then(corsify)
	}
}
