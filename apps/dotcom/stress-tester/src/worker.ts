/// <reference no-default-lib="true"/>
/// <reference types="@cloudflare/workers-types" />

import { createRouter } from '@tldraw/worker-shared'
import { WorkerEntrypoint } from 'cloudflare:workers'
import { cors } from 'itty-router'
import { Environment } from './types'
export { STCoordinatorDO } from './STCoordinatorDO'
export { STWorkerDO } from './STWorkerDO'

const { preflight, corsify } = cors({ origin: '*' })

// const router = Router()
// 	.all('*', preflight)
// 	.all('*', (req, env) => {
// 		const bearer = req.headers.get('Authorization')
// 		if (!bearer || bearer !== `Bearer ${env.ACCESS_TOKEN}`) {
// 			return new Response('Unauthorized', { status: 401 })
// 		}
// 		const coordinator = env.ST_COORDINATOR.get(env.ST_COORDINATOR.idFromName('coordinator'))
// 		return coordinator.fetch(req)
// 	})
// export default {
// 	fetch(req, env) {
// 		return router.handle(req, env).then(corsify)
// 	},
// }

// export default AutoRouter<IRequest, [env: Environment, ctx: ExecutionContext]>({
// 	before: [preflight],
// 	finally: [corsify],
// 	catch: (e) => {
// 		console.error(e)
// 		return error(e)
// 	},
// }).get('/state', (req, env) => {
// 	const bearer = req.headers.get('Authorization')
// 	if (!bearer || bearer !== `Bearer ${env.ACCESS_TOKEN}`) {
// 		return new Response('Unauthorized', { status: 401 })
// 	}
// 	const coordinator = env.ST_COORDINATOR.get(env.ST_COORDINATOR.idFromName('coordinator'))
// 	return coordinator.fetch(req)
// })

export default class Worker extends WorkerEntrypoint<Environment> {
	readonly router = createRouter()
		.get('*', preflight)
		.get('*', async (request) => {
			return '{"status": "ok"}'
		})

	override fetch(request: Request): Promise<Response> {
		return this.router.handle(request).then(corsify)
	}
}
