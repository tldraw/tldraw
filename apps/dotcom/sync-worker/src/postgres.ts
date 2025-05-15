import {
	PostgresJSClient,
	PostgresJSTransaction,
} from '@rocicorp/zero/out/zero-pg/src/postgresjs-connection'
import { DB, TlaRow, TlaSchema } from '@tldraw/dotcom-shared'
import { assert } from '@tldraw/utils'
import { Kysely, PostgresDialect } from 'kysely'
import * as pg from 'pg'
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

export function placeholders() {
	let i = 1
	return () => `$${i++}`
}

export class Query<Row extends TlaRow, isOne extends boolean = false> {
	constructor(
		private readonly client: pg.PoolClient,
		private readonly isOne: isOne,
		private readonly table: keyof TlaSchema['tables'],
		private readonly wheres: readonly string[] = [],
		private readonly params: readonly unknown[] = [],
		private readonly p = 1
	) {}

	where<K extends keyof Row>(key: K, op: '=', value: Row[K]) {
		return new Query<Row, isOne>(
			this.client,
			this.isOne,
			this.table,
			[...this.wheres, `"${String(key)}" ${op} $${this.p}`],
			[...this.params, value],
			this.p + 1
		)
	}

	async run(): Promise<isOne extends true ? Row : Row[]> {
		const whereClause = this.wheres.length > 0 ? `WHERE ${this.wheres.join(' AND ')}` : ''
		const sql = `SELECT * FROM "${this.table}" ${whereClause}`
		const res = await this.client.query(sql, [...this.params])
		if (this.isOne) {
			assert(res.rows.length === 1, 'Expected exactly one row')
			return res.rows[0] as any
		}
		return res.rows as any
	}

	one() {
		return new Query<Row, true>(this.client, true, this.table, this.wheres, this.params, this.p)
	}
}
