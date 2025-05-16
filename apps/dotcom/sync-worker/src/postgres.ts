import { SchemaValue } from '@rocicorp/zero'
import {
	PostgresJSClient,
	PostgresJSTransaction,
} from '@rocicorp/zero/out/zero-pg/src/postgresjs-connection'
import { DB, TlaSchema } from '@tldraw/dotcom-shared'
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

export function params() {
	const values = [] as any[]
	return Object.assign(
		(value: any) => {
			values.push(value)
			return `$${values.length}`
		},
		{
			values,
		}
	)
}

export function parseRow(row: any, table: TlaSchema['tables'][keyof TlaSchema['tables']]) {
	const entries = Object.entries(row)
	for (const [key, value] of entries) {
		const column = table.columns[key as keyof typeof table.columns] as SchemaValue
		if (!column) {
			throw new Error(`Unknown column ${key} in table ${table.name}`)
		}
		if (value == null && column.optional) {
			continue
		}
		switch (column.type) {
			case 'string':
				assert(typeof value === 'string', `Invalid type for column ${key} in table ${table.name}`)
				break
			case 'number':
				assert(typeof value === 'number', `Invalid type for column ${key} in table ${table.name}`)
				break
			case 'boolean':
				assert(typeof value === 'boolean', `Invalid type for column ${key} in table ${table.name}`)
				break
			case 'json':
				throw new Error('json not supported in our custom thingy yet')
			default:
				throw new Error(`Unknown type ${column.type} for column ${key} in table ${table.name}`)
		}
	}
	for (const key of table.primaryKey) {
		if (!(key in row)) {
			throw new Error(`Missing primary key ${key} in table ${table.name}`)
		}
	}
	const param = params()
	const str = JSON.stringify
	return {
		row,
		primaryKeys: () => table.primaryKey.map((key) => str(key)).join(', '),
		primaryKeyWhereClause: () =>
			table.primaryKey.map((key) => `${str(key)} = ${param(row[key])}`).join(' AND '),
		allValues: () => entries.map(([_key, value]) => param(value)),
		allKeys: () => entries.map(([key]) => str(key)).join(', '),
		nonPrimaryKeysArray: () =>
			entries.map(([key]) => key).filter((key) => !table.primaryKey.includes(key)),
		rowValue: (key: string) => {
			if (!(key in row)) {
				throw new Error(`Missing value for column ${key} in table ${table.name}`)
			}
			return param(row[key] ?? null)
		},
		paramValues: param.values,
	}
}
