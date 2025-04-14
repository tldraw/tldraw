import { DB, STCoordinatorState, STWorkerEvent } from '@tldraw/dotcom-shared'
import { assert, sleep, uniqueId } from '@tldraw/utils'
import { DurableObject } from 'cloudflare:workers'
import { AutoRouter, cors, error } from 'itty-router'
import { Kysely, PostgresDialect, sql } from 'kysely'
import * as pg from 'pg'
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

export function createPostgresConnectionPool(env: Environment, name: string, max: number = 1) {
	const pool = new pg.Pool({
		connectionString: env.BOTCOM_POSTGRES_POOLED_CONNECTION_STRING,
		application_name: name,
		idleTimeoutMillis: 10_000,
		max,
	})

	const dialect = new PostgresDialect({ pool })

	const db = new Kysely<DB>({
		dialect,
		log: ['error'],
	})
	return db
}

export class STCoordinatorDO extends DurableObject<Environment> {
	state: STCoordinatorState = {
		tests: {},
	}

	otherStub
	db
	constructor(state: DurableObjectState, env: Environment) {
		super(state, env)
		this.otherStub = env.ST_COORDINATOR.get(env.ST_COORDINATOR.idFromName('otherone'))
		this.db = createPostgresConnectionPool(env, 'STCoordinatorDO', 1)
	}
	_debug(...args: any[]) {
		console.log('ST_COORDINATOR', ...args)
	}
	debug(...args: any[]) {
		this.otherStub._debug(args)
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
			// this.debug(
			// 	`starting ${request.params.testId} with: uri: ${uri} workers: ${workers} files: ${files} startWithin: ${startWithin}`
			// )

			this.state.tests[request.params.testId] = {
				running: true,
				events: [],
				numWorkers: workers,
			}

			const promises = []
			for (let i = 0; i < workers; i++) {
				const id = `${request.params.testId}:${i}`
				const now = Date.now()
				const worker = env.ST_WORKER.get(env.ST_WORKER.idFromName(id), {
					locationHint: regions[i % regions.length],
				}) as any as STWorkerDO
				promises.push(worker.start(startWithin, files, id, uri))
				// this.debug('time to start worker', id, Date.now() - now)
			}
			this.debug('waiting now')
			await Promise.all(promises)
			this.debug('All workers started')

			for (let i = 0; i < workers; i++) {
				const id = `${request.params.testId}:${i}`
				const worker = env.ST_WORKER.get(env.ST_WORKER.idFromName(id), {
					locationHint: regions[i % regions.length],
				}) as any as STWorkerDO
				worker.work()
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
		.post('/update-names', async () => {
			this.debug('updating names')
			await this.updateNames()
			return new Response('Updated', { status: 200 })
		})

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

	async updateNames() {
		const suffix = uniqueId()
		const [testId] = Object.keys(this.state.tests)
		const numWorkers = this.state.tests[testId].numWorkers
		for (let i = 0; i < numWorkers; i++) {
			await sql`update public.user set name = ${'Test User ' + suffix} where id = ${testId + ':' + i}`.execute(
				this.db
			)
		}
		await sleep(1000)
		const errors = []
		for (let i = 0; i < numWorkers; i++) {
			const worker = this.env.ST_WORKER.get(
				this.env.ST_WORKER.idFromName(`${testId}:${i}`)
			) as any as STWorkerDO
			const data = await worker.getState()
			if (data?.user.name !== 'Test User ' + suffix) {
				errors.push('Name not updated', data?.user.name)
			}
		}
		if (errors.length > 0) {
			throw new Error('Errors updating names: ' + errors.join(', '))
		}
	}
}

// 1. check that users don't do database/replicator requests on reconnect after deploy
// 2. check that users don't do database/replicator requests on reconnect after replicator restart
// 3. check that updating user's information directly in db syncs to their DO after a deploy
