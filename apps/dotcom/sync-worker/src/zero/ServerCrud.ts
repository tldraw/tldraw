import type { SchemaValue, TableMutator, TableSchema } from '@rocicorp/zero'
import {
	DB,
	TlaFile,
	TlaRow,
	TlaRowPartial,
	TlaSchema,
	ZErrorCode,
	ZTable,
} from '@tldraw/dotcom-shared'
import { assert, omit } from '@tldraw/utils'
import {
	CompiledQuery,
	DummyDriver,
	Kysely,
	PostgresAdapter,
	PostgresIntrospector,
	PostgresPoolClient,
	PostgresQueryCompiler,
	PostgresQueryResult,
} from 'kysely'
import { QueryResultRow } from 'pg'
import { ZMutationError } from './ZMutationError'
const quote = (s: string) => '"' + s.replace(/"/g, '""') + '"'

export type ChangeAccumulator = {
	[table in ZTable]?: {
		added?: TlaRow[]
		updated?: TlaRow[]
		removed?: TlaRowPartial[]
	}
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

export class ServerCRUD
	implements TableMutator<TlaSchema['tables'][keyof TlaSchema['tables']] & TableSchema>
{
	constructor(
		private readonly client: PostgresPoolClient,
		private readonly table: TlaSchema['tables'][keyof TlaSchema['tables']],
		private readonly signal: AbortSignal,
		private readonly changeAccumulator?: ChangeAccumulator
	) {}
	private async _trackAdded(data: any) {
		if (!this.changeAccumulator) return

		// Special case: when file_state is added, track the corresponding file
		if (this.table.name === 'file_state' && this.changeAccumulator.file?.added) {
			const res = await this.client.query<TlaFile>(
				`select * from public.${quote('file')} where id = $1`,
				[data.fileId]
			)
			assert(res.rowCount === 1, 'file not found')
			this.changeAccumulator.file.added.push(res.rows[0])
		}

		// Track the added row for this table
		if (this.changeAccumulator[this.table.name]?.added) {
			const res = await this.client.query(
				`select * from public.${quote(this.table.name)} where ${this.table.primaryKey
					.map((key, i) => `${quote(key)} = $${i + 1}`)
					.join(' AND ')}`,
				this.table.primaryKey.map((key) => data[key])
			)
			assert(res.rowCount === 1, 'row not found')
			this.changeAccumulator[this.table.name]?.added!.push(res.rows[0] as TlaRow)
		}
	}

	private async _trackUpdated(data: any) {
		if (!this.changeAccumulator?.[this.table.name]?.updated) return

		const res = await this.client.query(
			`select * from public.${quote(this.table.name)} where ${this.table.primaryKey
				.map((key, i) => `${quote(key)} = $${i + 1}`)
				.join(' AND ')}`,
			this.table.primaryKey.map((key) => data[key])
		)
		assert(res.rowCount === 1, 'row not found')
		this.changeAccumulator[this.table.name]?.updated!.push(res.rows[0] as TlaRow)
	}

	private async _trackRemoved(data: any) {
		if (!this.changeAccumulator?.[this.table.name]?.removed) return

		const primaryKeyData: any = {}
		for (const key of this.table.primaryKey) {
			primaryKeyData[key] = data[key]
		}
		this.changeAccumulator[this.table.name]?.removed!.push(primaryKeyData)
	}

	private async _exec<T extends QueryResultRow>(query: {
		compile(): CompiledQuery<T>
	}): Promise<PostgresQueryResult<T>> {
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
		await this._trackAdded(data)
	}

	async upsert(data: any) {
		assert(!this.signal.aborted, 'CRUD usage outside of mutator scope')
		assertRowIsValid(data, this.table)

		const didExist = await this._doesExist(data)

		await this._exec(
			db
				.insertInto(this.table.name)
				.values(data)
				.onConflict((oc) => {
					return oc.columns(this.table.primaryKey).doUpdateSet(omit(data, this.table.primaryKey))
				})
		)

		if (!didExist) {
			await this._trackAdded(data)
		} else {
			await this._trackUpdated(data)
		}
	}

	async delete(data: any) {
		assert(!this.signal.aborted, 'CRUD usage outside of mutator scope')
		assertRowIsValid(data, this.table)
		await this._exec(this._wherePrimaryKey(db.deleteFrom(this.table.name), data))
		await this._trackRemoved(data)
	}

	async update(data: any) {
		assert(!this.signal.aborted, 'CRUD usage outside of mutator scope')
		assertRowIsValid(data, this.table)
		const vals = omit(data, this.table.primaryKey)
		if (Object.keys(vals).length === 0) {
			console.error('update is a noop', data)
			return
		}

		const res = await this._exec(
			this._wherePrimaryKey(db.updateTable(this.table.name).set(vals), data)
		)
		if (res.rowCount !== 1) {
			// might have been a noop
			const doesExist = await this._doesExist(data)
			if (!doesExist) {
				throw new ZMutationError(ZErrorCode.bad_request, `update failed, no matching rows`)
			}
		}
		await this._trackUpdated(data)
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
