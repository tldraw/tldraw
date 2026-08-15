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
			// The start event above and the timed completion below are deliberately separate
			// datapoints: a dial that hangs never completes, so hung connections are only
			// countable as starts minus dones. Completion durations cover TCP + TLS + auth
			// (through pgbouncer) — the layer where the 2026-08-10 connection stalls lived.
			const dialStart = Date.now()
			const done = (outcome: 'ok' | 'error') => {
				writeDataPoint(undefined, env.MEASURE, env, 'postgres_client_connect_done', {
					blobs: [name, outcome],
					doubles: [Date.now() - dialStart],
				})
			}
			if (typeof callback === 'function') {
				return super.connect((err: Error) => {
					done(err ? 'error' : 'ok')
					callback(err)
				})
			}
			const promise = super.connect()
			promise.then(
				() => done('ok'),
				() => done('error')
			)
			return promise
		}
	}
	const pool = new pg.Pool({
		connectionString: env.BOTCOM_POSTGRES_POOLED_CONNECTION_STRING,
		application_name: name,
		idleTimeoutMillis: 5_000,
		max,
		Client: LoggingClient,
	})

	// Checkout wait is distinct from dial time: with all `max` clients busy, an acquire queues
	// without dialing at all, which client-level events can't see. Kysely acquires through the
	// promise overload; the callback overload passes through untimed.
	const poolConnect = pool.connect.bind(pool)
	pool.connect = function (callback?: any): any {
		if (typeof callback === 'function') return poolConnect(callback)
		const acquireStart = Date.now()
		const acquired = (outcome: 'ok' | 'error') => {
			writeDataPoint(undefined, env.MEASURE, env, 'postgres_pool_acquire', {
				blobs: [name, outcome],
				doubles: [Date.now() - acquireStart],
			})
		}
		const promise = poolConnect()
		promise.then(
			() => acquired('ok'),
			() => acquired('error')
		)
		return promise
	} as typeof pool.connect

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
		const acquireStart = Date.now()
		const prevLock = this._lock
		const released = promiseWithResolve<void>()
		this._lock = released

		await prevLock

		const client = new pg.Client({
			connectionString: this.env.BOTCOM_POSTGRES_POOLED_CONNECTION_STRING,
			application_name: 'user-do',
			keepAlive: false,
		})
		// Mirror LoggingClient's end/error accounting: the connection-events panel balances
		// connects against ends to spot leaks, so a client that records a connect but never an
		// end would read as a permanent leak there.
		client.on('end', () => {
			writeDataPoint(undefined, this.env.MEASURE, this.env, 'postgres_client_end', {
				blobs: ['user-do'],
			})
		})
		client.on('error', () => {
			writeDataPoint(undefined, this.env.MEASURE, this.env, 'postgres_client_error', {
				blobs: ['user-do'],
			})
		})

		// Same start/done pairing as LoggingClient above: a hung dial only ever shows up as a
		// start with no matching done, and this fresh-client-per-checkout path is otherwise
		// completely invisible in MEASURE.
		writeDataPoint(undefined, this.env.MEASURE, this.env, 'postgres_client_connect', {
			blobs: ['user-do'],
		})
		const dialStart = Date.now()
		try {
			await client.connect()
		} catch (e) {
			writeDataPoint(undefined, this.env.MEASURE, this.env, 'postgres_client_connect_done', {
				blobs: ['user-do', 'error'],
				doubles: [Date.now() - dialStart],
			})
			// A failed dial is also a failed checkout, matching the pool wrapper above — without
			// this, error acquires drop their lock-wait + dial duration for user-do.
			writeDataPoint(undefined, this.env.MEASURE, this.env, 'postgres_pool_acquire', {
				blobs: ['user-do', 'error'],
				doubles: [Date.now() - acquireStart],
			})
			released.resolve(undefined)
			throw e
		}
		writeDataPoint(undefined, this.env.MEASURE, this.env, 'postgres_client_connect_done', {
			blobs: ['user-do', 'ok'],
			doubles: [Date.now() - dialStart],
		})
		// Lock wait + dial together: this pool serializes checkouts, so a slow holder shows up
		// here as acquire time even when the dial itself is fast.
		writeDataPoint(undefined, this.env.MEASURE, this.env, 'postgres_pool_acquire', {
			blobs: ['user-do', 'ok'],
			doubles: [Date.now() - acquireStart],
		})

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
