import { SchemaValue } from '@rocicorp/zero'
import { TableCRUD } from '@rocicorp/zero/out/zql/src/mutate/custom'
import { DB, TlaFile, TlaSchema, ZErrorCode } from '@tldraw/dotcom-shared'
import { assert, omit } from '@tldraw/utils'
import {
	CompiledQuery,
	DummyDriver,
	Kysely,
	PostgresAdapter,
	PostgresIntrospector,
	PostgresQueryCompiler,
} from 'kysely'
import { PoolClient, QueryResult, QueryResultRow } from 'pg'
import { ZMutationError } from './ZMutationError'
const quote = (s: string) => JSON.stringify(s)

/**
 * This perf hack allows us to get file data into the client more quickly.
 * For new files, we wake up that file's DO immediately after the file is created, rather
 * than waiting for the update to trickle through to the replicator.
 *
 * For files that are not owned by the user, we add the file to the user DO's store and
 * broadcast it to the client immediately so that it's ready to be used asap.
 */
export interface PerfHackHooks {
	newFiles: TlaFile[]
}

// this is a kind of 'headless' kysely client that we use to compile queries
const db = new Kysely<DB>({
	dialect: {
		createAdapter: () => new PostgresAdapter(),
		createDriver: () => new DummyDriver(),
		createIntrospector: (db) => new PostgresIntrospector(db),
		createQueryCompiler: () => new PostgresQueryCompiler(),
	},
})

export class ServerCRUD implements TableCRUD<TlaSchema['tables'][keyof TlaSchema['tables']]> {
	constructor(
		private readonly client: PoolClient,
		private readonly table: TlaSchema['tables'][keyof TlaSchema['tables']],
		private readonly signal: AbortSignal,
		private readonly perfHackHooks?: PerfHackHooks
	) {}
	private async _onNewRow(data: any) {
		if (!this.perfHackHooks) return
		if (this.table.name === 'file_state') {
			const res = await this.client.query<TlaFile>(
				`select * from public.${quote('file')} where id = $1`,
				[data.fileId]
			)
			assert(res.rowCount === 1, 'file not found')
			if (res.rows[0].ownerId !== data.userId) {
				this.perfHackHooks.newFiles.push(res.rows[0])
			}
		} else if (this.table.name === 'file') {
			this.perfHackHooks.newFiles.push(data as TlaFile)
		}
	}

	private async _exec<T extends QueryResultRow>(query: {
		compile(): CompiledQuery<T>
	}): Promise<QueryResult<T>> {
		const { sql, parameters } = query.compile()
		return await this.client.query<T>(sql, parameters as any)
	}

	private _wherePrimaryKey(qb: any, row: any) {
		for (const key of this.table.primaryKey) {
			qb = qb.where(key, '=', row[key])
		}
		return qb
	}

	private async _doesExist(row: any) {
		const rows = await this._exec(
			this._wherePrimaryKey(
				db.selectFrom(this.table.name).select((eb) => eb.lit(1).as('blah')),
				row
			)
		)
		return !!rows.rowCount
	}

	async insert(data: any) {
		assert(!this.signal.aborted, 'CRUD usage outside of mutator scope')
		assertRowIsValid(data, this.table)
		await this._exec(db.insertInto(this.table.name).values(data))
		await this._onNewRow(data)
	}

	async upsert(data: any) {
		assert(!this.signal.aborted, 'CRUD usage outside of mutator scope')
		assertRowIsValid(data, this.table)

		// we only need this for the perf hack
		const didExist = await this._doesExist(data)

		await this._exec(
			db
				.insertInto(this.table.name)
				.values(data)
				.onConflict((oc) => {
					return oc.columns(this.table.primaryKey).doUpdateSet(omit(data, this.table.primaryKey))
				})
		)

		if (didExist) {
			await this._onNewRow(data)
		}
	}

	async delete(data: any) {
		assert(!this.signal.aborted, 'CRUD usage outside of mutator scope')
		assertRowIsValid(data, this.table)
		await this._exec(this._wherePrimaryKey(db.deleteFrom(this.table.name), data))
	}

	async update(data: any) {
		assert(!this.signal.aborted, 'CRUD usage outside of mutator scope')
		assertRowIsValid(data, this.table)

		const res = await this._exec(
			this._wherePrimaryKey(
				db.updateTable(this.table.name).set(omit(data, this.table.primaryKey)),
				data
			)
		)
		if (res.rowCount !== 1) {
			// might have been a noop
			const doesExist = await this._doesExist(data)
			if (!doesExist) {
				throw new ZMutationError(ZErrorCode.bad_request, `update failed, no matching rows`)
			}
		}
	}
}

function assertRowIsValid(row: any, table: TlaSchema['tables'][keyof TlaSchema['tables']]): void {
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
}
