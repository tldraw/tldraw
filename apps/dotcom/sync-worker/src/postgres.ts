import { DB } from '@tldraw/dotcom-shared'
import { Kysely, PostgresDialect } from 'kysely'
import * as pg from 'pg'
import postgres from 'postgres'
import { Environment } from './types'

/**
 * In most cases you want to use a pooled connection, which is what `createPostgresConnectionPool` does.
 * Use this one only for cases like subscriptions where you need to listen for notifications / WAL.
 */
export function createPostgresConnection(
	env: Environment,
	{ name, idleTimeout = 30 }: { name: string; idleTimeout?: number }
) {
	return postgres(env.BOTCOM_POSTGRES_CONNECTION_STRING, {
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
	})
}

const int8TypeId = 20
pg.types.setTypeParser(int8TypeId, (val) => {
	return parseInt(val, 10)
})

export function createPostgresConnectionPool(env: Environment, name: string) {
	const dialect = new PostgresDialect({
		pool: new pg.Pool({
			connectionString: env.BOTCOM_POSTGRES_POOLED_CONNECTION_STRING,
			application_name: name,
			idleTimeoutMillis: 10_000,
			max: 450,
		}),
	})

	const db = new Kysely<DB>({
		dialect,
		log: ['error'],
	})
	return db
}
