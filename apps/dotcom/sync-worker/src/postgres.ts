import {
	PostgresJSClient,
	PostgresJSTransaction,
} from '@rocicorp/zero/out/zero-pg/src/postgresjs-connection'
import { DB } from '@tldraw/dotcom-shared'
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
