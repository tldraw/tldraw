import { DB } from '@tldraw/dotcom-shared'
import { Kysely, PostgresDialect } from 'kysely'
import * as pg from 'pg'
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
