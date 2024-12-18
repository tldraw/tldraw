import { STCoordinatorState, STWorkerEvent } from '@tldraw/dotcom-shared'
import { assert } from '@tldraw/utils'
import { DurableObject } from 'cloudflare:workers'
import { AutoRouter, cors, error } from 'itty-router'
import { STWorkerDO } from './STWorkerDO'
import { Environment } from './types'

const regions: DurableObjectLocationHint[] = [
	'wnam',
	'enam',
	'sam',
	'weur',
	'eeur',
	'apac',
	'oc',
	'afr',
	'me',
]

const { preflight, corsify } = cors({ origin: '*' })

export class STCoordinatorDO extends DurableObject<Environment> {
	state: STCoordinatorState = {
		tests: {},
	}
	constructor(state: DurableObjectState, env: Environment) {
		super(state, env)
	}
	debug(...args: any[]) {
		// console.log('ST_COORDINATOR', ...args)
	}
	router = AutoRouter({
		before: [preflight],
		finally: [corsify],
		catch: (e) => {
			console.error(e)
			return error(e)
		},
	})
		// when we get a connection request, we stash the room id if needed and handle the connection
		.post('/:testId/start', async (request, env: Environment) => {
			const body = (await request.json()) as any
			assert(request.params.testId.indexOf(':') === -1, 'Invalid test id')
			const { uri, workers, files, startWithin } = body
			this.debug(
				`starting ${request.params.testId} with: uri: ${uri} workers: ${workers} files: ${files} startWithin: ${startWithin}`
			)

			this.state.tests[request.params.testId] = {
				running: true,
				events: [],
				numWorkers: workers,
			}

			for (let i = 0; i < workers; i++) {
				const id = `${request.params.testId}:${i}`
				const now = Date.now()
				const worker = env.ST_WORKER.get(env.ST_WORKER.idFromName(id), {
					locationHint: regions[i % regions.length],
				}) as any as STWorkerDO
				worker.start(startWithin, files, id, uri)
				this.debug('time to start worker', id, Date.now() - now)
			}
			return new Response('Started', { status: 200 })
		})
		.post('/:testId/stop', async (request) => {
			this.debug('Stopping test', request.params.testId)
			const { workers } = (await request.json()) as any
			this.state.tests[request.params.testId].running = false
			for (let i = 0; i < workers; i++) {
				const id = `${request.params.testId}:${i}`
				const worker = this.env.ST_WORKER.get(
					this.env.ST_WORKER.idFromName(id)
				) as any as STWorkerDO
				await worker.stop()
			}
			return new Response('Stopped', { status: 200 })
		})
		.get('/reset', () => {
			this.debug('resetting')
			this.state = {
				tests: {},
			}
			return new Response('Reset', { status: 200 })
		})
		.get('/state', () => new Response(JSON.stringify(this.getState()), { status: 200 }))

	getState(): STCoordinatorState {
		return this.state
	}

	override fetch(request: Request) {
		return this.router.fetch(request, this.env)
	}

	reportEvent(event: STWorkerEvent) {
		const testId = event.workerId.split(':')[0]
		// this.debug('testId', testId)
		if (event.error === null) {
			delete event.error
		}
		this.state.tests[testId].events.push(event)
	}
}
