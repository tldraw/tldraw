import { DB } from '@tldraw/dotcom-shared'
import { promiseWithResolve } from '@tldraw/utils'
import { Kysely, PostgresDialect, PostgresPool, PostgresPoolClient } from 'kysely'
import * as pg from 'pg'
import { Logger } from './Logger'
import { Environment } from './types'
import { writeDataPoint } from './utils/analytics'

const int8TypeId = 20
pg.types.setTypeParser(int8TypeId, (val) => {
	return parseInt(val, 10)
})

export function createPostgresConnectionPool(env: Environment, name: string, max: number = 1) {
	class LoggingClient extends pg.Client {
		constructor(config?: string | pg.ClientConfig) {
			super(config)

			this.on('end', () => {
				writeDataPoint(undefined, env.MEASURE, env, 'postgres_client_end', {
					blobs: [name],
				})
			})

			this.on('error', () => {
				writeDataPoint(undefined, env.MEASURE, env, 'postgres_client_error', {
					blobs: [name],
				})
			})
		}

		override connect(callback?: any): any {
			writeDataPoint(undefined, env.MEASURE, env, 'postgres_client_connect', {
				blobs: [name],
			})
			return super.connect(callback)
		}
	}
	const pool = new pg.Pool({
		connectionString: env.BOTCOM_POSTGRES_POOLED_CONNECTION_STRING,
		application_name: name,
		idleTimeoutMillis: 5_000,
		max,
		Client: LoggingClient,
	})

	const dialect = new PostgresDialect({ pool })

	const db = new Kysely<DB>({
		dialect,
		log: ['error'],
	})
	return db
}

/**
 * A pool that creates a fresh pg.Client per connect() call and tears it down
 * on release, so no idle connections or background timers linger between
 * requests. This lets the Durable Object hibernate properly.
 */
export class TLPostgresPool implements PostgresPool {
	private _lock: Promise<void> = Promise.resolve()

	constructor(
		private env: Environment,
		private log: Logger
	) {}

	async connect(): Promise<PostgresPoolClient> {
		const prevLock = this._lock
		const released = promiseWithResolve<void>()
		this._lock = released

		await prevLock

		const client = new pg.Client({
			connectionString: this.env.BOTCOM_POSTGRES_POOLED_CONNECTION_STRING,
			application_name: 'user-do',
			keepAlive: false,
		})

		try {
			await client.connect()
		} catch (e) {
			released.resolve(undefined)
			throw e
		}

		return {
			query: (...args: any[]) => (client.query as any)(...args),
			release() {
				client.end().catch(() => {})
				// Forcefully destroy the TCP socket so it doesn't linger
				// and block Durable Object hibernation. The graceful end()
				// above sends the PG Terminate message; destroy() ensures
				// the socket handle is removed from the event loop immediately.
				const stream = (client as any).connection?.stream
				if (stream && typeof stream.destroy === 'function') {
					stream.destroy()
				}
				released.resolve(undefined)
			},
		} as PostgresPoolClient
	}

	async end() {
		await this._lock
	}
}
