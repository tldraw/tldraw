import {
	PostgresJSClient,
	PostgresJSTransaction,
} from '@rocicorp/zero/out/zero-pg/src/postgresjs-connection'
import { DB } from '@tldraw/dotcom-shared'
import { promiseWithResolve } from '@tldraw/utils'
import {
	Kysely,
	PostgresCursor,
	PostgresDialect,
	PostgresPool,
	PostgresPoolClient,
	PostgresQueryResult,
} from 'kysely'
import * as pg from 'pg'
import { Logger } from './Logger'
import { Environment } from './types'

const int8TypeId = 20
pg.types.setTypeParser(int8TypeId, (val) => {
	return parseInt(val, 10)
})

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

export function makePostgresConnector(env: Environment): PostgresJSClient<any> {
	const pool = new pg.Pool({
		connectionString: env.BOTCOM_POSTGRES_POOLED_CONNECTION_STRING,
		application_name: 'zero-pg',
		idleTimeoutMillis: 3_000,
		max: 1,
	})

	return {
		async unsafe(sqlString: string, params: unknown[]): Promise<any[]> {
			const res = await pool.query(sqlString, params)
			return res.rows
		},
		async begin(fn: (tx: PostgresJSTransaction) => Promise<any>): Promise<any> {
			const client = await pool.connect()
			try {
				await client.query('BEGIN')
				const res = await fn({
					async unsafe(sqlString: string, params: unknown[]): Promise<any[]> {
						const res = await client.query(sqlString, params)
						return res.rows
					},
				})
				await client.query('COMMIT')
				return res
			} catch (e) {
				await client.query('ROLLBACK')
				throw e
			} finally {
				client.release()
			}
		},
	}
}

export class TLPostgresPoolClient implements PostgresPoolClient {
	_client: pg.Client
	_releasePromise: undefined | ReturnType<typeof promiseWithResolve>

	constructor(private env: Environment) {
		this._client = new pg.Client({
			connectionString: env.BOTCOM_POSTGRES_POOLED_CONNECTION_STRING,
			application_name: 'zero-pg',
			keepAlive: false,
		})
	}

	async waitForRelease() {
		await this._releasePromise
	}

	release(): void {
		this._releasePromise?.resolve(null)
	}

	query<R>(sql: string, parameters: readonly unknown[]): Promise<PostgresQueryResult<R>>
	query<R>(cursor: PostgresCursor<R>): PostgresCursor<R>
	query(...rest: any[]) {
		return (this._client.query as any)(...rest)
	}
}

export class TLPostgresPool implements PostgresPool {
	private _client: TLPostgresPoolClient | undefined

	constructor(
		private env: Environment,
		private log: Logger
	) {}

	i = 0

	async connect(): Promise<PostgresPoolClient> {
		while (this._client) {
			await this._client.waitForRelease()
		}

		const id = this.i++
		this.log.debug('creating client', id)
		const client = (this._client = new TLPostgresPoolClient(this.env))
		await client._client.connect()
		this._client._releasePromise = promiseWithResolve()
		this._client._releasePromise.then(() => {
			this.log.debug('releasing client', id)
			client._client.end()
			// @ts-expect-error unref is not in the types
			client._client.unref()
			this._client = undefined
		})
		return this._client
	}

	async end() {
		if (!this._client) {
			return
		}
		this._client.release()
		await this._client.waitForRelease()
		this._client = undefined
	}
}
