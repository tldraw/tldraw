import { DB } from '@tldraw/dotcom-shared'
import { Kysely, PostgresDialect } from 'kysely'
import * as pg from 'pg'
import postgres from 'postgres'
import { Environment } from './types'

/**
 * `pooled` should be almost always be true.
 */
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
			max: 100,
			// idle_timeout: idleTimeout,
			connection: {
				application_name: name,
			},
		}
	)
}

const int8TypeId = 20
pg.types.setTypeParser(int8TypeId, (val) => {
	return parseInt(val, 10)
})

export function getPostgres2(
	env: Environment,
	{ pooled, name }: { pooled: boolean; name: string }
) {
	const dialect = new PostgresDialect({
		pool: new pg.Pool({
			connectionString: pooled
				? env.BOTCOM_POSTGRES_POOLED_CONNECTION_STRING
				: env.BOTCOM_POSTGRES_CONNECTION_STRING,
			application_name: name,
			idleTimeoutMillis: 10_000,
			max: 450,
			// log: (msg) => console.log(msg),
		}),
	})

	const db = new Kysely<DB>({
		dialect,
		// plugins: [new CamelCasePlugin()],
		// log: ['query', 'error'],
		log: ['error'],
	})
	return db
}
