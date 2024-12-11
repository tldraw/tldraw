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
const NUMBER_OF_WORKERS = 400
const START_WITHIN = 1000

export class STCoordinatorDO extends DurableObject<Environment> {
	state: STCoordinatorState = {
		tests: {},
	}
	constructor(state: DurableObjectState, env: Environment) {
		super(state, env)
	}
	debug(...args: any[]) {
		// eslint-disable-next-line no-console
		console.log(...args)
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
			const body = await request.json()
			assert(request.params.testId.indexOf(':') === -1, 'Invalid test id')

			this.state.tests[request.params.testId] = {
				running: true,
				events: [],
				numWorkers: NUMBER_OF_WORKERS,
			}

			for (let i = 0; i < NUMBER_OF_WORKERS; i++) {
				const id = `${request.params.testId}:${i}`
				const worker = env.ST_WORKER.get(env.ST_WORKER.idFromName(id), {
					locationHint: regions[i % regions.length],
				}) as any as STWorkerDO
				await worker.start(START_WITHIN, id, (body as any).uri)
			}
			return new Response('Started', { status: 200 })
		})
		.post('/:testId/stop', async (request) => {
			this.debug('Stopping test', request.params.testId)
			this.state.tests[request.params.testId].running = false
			for (let i = 0; i < NUMBER_OF_WORKERS; i++) {
				const id = `${request.params.testId}:${i}`
				const worker = this.env.ST_WORKER.get(
					this.env.ST_WORKER.idFromName(id)
				) as any as STWorkerDO
				await worker.stop()
			}
			return new Response('Stopped', { status: 200 })
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
		this.debug('testId', testId)
		if (event.error === null) {
			delete event.error
		}
		this.state.tests[testId].events.push(event)
	}
}
