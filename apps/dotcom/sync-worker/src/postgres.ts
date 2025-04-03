import type {
	PostgresSQL,
	PostgresTransaction,
} from '@rocicorp/zero/out/zero-pg/src/postgres-connection'
import { DB } from '@tldraw/dotcom-shared'
import { CompiledQuery, Kysely, PostgresDialect } from 'kysely'
import * as pg from 'pg'
import postgres from 'postgres'
import { Environment } from './types'

const int8TypeId = 20
pg.types.setTypeParser(int8TypeId, (val) => {
	return parseInt(val, 10)
})

export function createPostgresConnectionPool(env: Environment, name: string, max: number = 1) {
	const dialect = new PostgresDialect({
		pool: new pg.Pool({
			connectionString: env.BOTCOM_POSTGRES_POOLED_CONNECTION_STRING,
			application_name: name,
			idleTimeoutMillis: 10_000,
			max,
		}),
	})

	const db = new Kysely<DB>({
		dialect,
		log: ['error'],
	})
	return db
}

export function makePostgresConnector(env: Environment): PostgresSQL<any> {
	return getPostgres(env, { pooled: true, name: 'blah' })
	const db = createPostgresConnectionPool(env, 'makePostgresConnector')

	return {
		async unsafe(sqlString: string, params: unknown[]): Promise<any[]> {
			console.log('sqlString', sqlString)
			const res = await db.executeQuery(CompiledQuery.raw(sqlString, params))
			return res.rows
		},
		begin(fn: (tx: PostgresTransaction) => Promise<any>): Promise<any> {
			return db.transaction().execute(() =>
				fn({
					async unsafe(sqlString: string, params: unknown[]): Promise<any[]> {
						console.log('sqlString', sqlString)
						const res = await db.executeQuery(CompiledQuery.raw(sqlString, params))
						return res.rows
					},
				})
			)
		},
	}
}

export function getPostgres(
	env: Environment,
	{ pooled, name, idleTimeout = 30 }: { pooled: boolean; name: string; idleTimeout?: number }
) {
	return postgres(
		pooled ? env.BOTCOM_POSTGRES_POOLED_CONNECTION_STRING : env.BOTCOM_POSTGRES_CONNECTION_STRING,
		{
			types: {
				bigint: {
					from: [20], // PostgreSQL OID for BIGINT
					parse: (value: string) => Number(value), // Convert string to number
					to: 20,
					serialize: (value: number) => String(value), // Convert number to string
				},
			},
			idle_timeout: idleTimeout,
			connection: {
				application_name: name,
			},
		}
	)
}
