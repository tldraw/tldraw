import { ExecutionContext } from '@cloudflare/workers-types'
import { WorkerEntrypoint } from 'cloudflare:workers'
import { AutoRouter, cors, error, IRequest } from 'itty-router'
import { generate } from './routes/generate'
import { stream } from './routes/stream'
import { Environment } from './types'

const { preflight, corsify } = cors({ origin: '*' })

// Router used by the worker
const workerRouter = AutoRouter<IRequest, [env: Environment, ctx: ExecutionContext]>({
	before: [preflight],
	finally: [corsify],
	catch: (e) => {
		console.error(e)
		return error(e)
	},
})
	.post('/generate', generate)
	.post('/stream', stream)

// Worker (forwards requests to the Durable Object via the worker router)
export default class extends WorkerEntrypoint<Environment> {
	override fetch(request: IRequest): Promise<Response> {
		return workerRouter.fetch(request, this.env, this.ctx)
	}
}

export { MyDurableObject } from './do'
