import { DB } from '@tldraw/dotcom-shared'
import { Kysely, PostgresDialect } from 'kysely'
import * as pg from 'pg'
import { Environment } from './types'

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
			max: 1,
		}),
	})

	const db = new Kysely<DB>({
		dialect,
		log: ['error'],
	})
	return db
}
