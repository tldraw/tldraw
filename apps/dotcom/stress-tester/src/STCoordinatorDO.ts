import { STCoordinatorState } from '@tldraw/dotcom-shared'
import { DurableObject } from 'cloudflare:workers'
import { AutoRouter, cors, error } from 'itty-router'
import { Environment } from './types'

const regions = ['wnam', 'enam', 'sam', 'weur', 'eeur', 'apac', 'oc', 'afr', 'me']

const { preflight, corsify } = cors({ origin: '*' })

export class STCoordinatorDO extends DurableObject {
	constructor(state: DurableObjectState, env: Environment) {
		super(state, env)
		console.log('STCoordinatorDO created')
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
		.post('/:testId/start', async (request) => {})
		.post('/:testId/stop', async (request) => {})
		.get('/state', () => new Response(JSON.stringify(this.getState()), { status: 200 }))

	getState(): STCoordinatorState {
		return {
			tests: {},
		}
	}

	override fetch(request) {
		return this.router.fetch(request)
	}
}
