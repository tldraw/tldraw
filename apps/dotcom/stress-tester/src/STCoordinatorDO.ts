import { STCoordinatorState } from '@tldraw/dotcom-shared'
import { DurableObject } from 'cloudflare:workers'
import { AutoRouter, cors, error } from 'itty-router'
import { Environment } from './types'

const regions = ['wnam', 'enam', 'sam', 'weur', 'eeur', 'apac', 'oc', 'afr', 'me']

const { preflight, corsify } = cors({ origin: '*' })

export class STCoordinatorDO extends DurableObject {
	state: STCoordinatorState = {
		tests: {},
	}
	constructor(state: DurableObjectState, env: Environment) {
		super(state, env)
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
		.post('/:testId/start', async (request) => {
			console.info('Starting test', request.params.testId)
			this.state.tests[request.params.testId] = {
				running: true,
			}
		})
		.post('/:testId/stop', async (request) => {
			console.info('Stopping test', request.params.testId)
			this.state.tests[request.params.testId] = {
				running: false,
			}
		})
		.get('/state', () => new Response(JSON.stringify(this.getState()), { status: 200 }))

	getState(): STCoordinatorState {
		return this.state
	}

	override fetch(request: Request) {
		return this.router.fetch(request)
	}
}
