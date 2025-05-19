import { SchemaValue } from '@rocicorp/zero'
import { TableCRUD } from '@rocicorp/zero/out/zql/src/mutate/custom'
import { TlaFile, TlaSchema, ZErrorCode } from '@tldraw/dotcom-shared'
import { assert } from '@tldraw/utils'
import { PoolClient } from 'pg'
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
	async insert(data: any) {
		assert(!this.signal.aborted, 'CRUD usage outside of mutator scope')
		const row = validateAndAugmentRow(data, this.table)
		await this.client.query(
			`insert into public.${quote(this.table.name)} (${row.allKeys()}) values (${row.allValues()})`,
			row.paramValues
		)
		await this._onNewRow(data)
	}
	async upsert(data: any) {
		assert(!this.signal.aborted, 'CRUD usage outside of mutator scope')
		const row = validateAndAugmentRow(data, this.table)

		// we only need this for the perf hack
		const didExist = !!(
			await this.client.query(
				`select 1 from public.${quote(this.table.name)} where ${row.primaryKeyWhereClause()}`,
				row.paramValues
			)
		).rowCount

		await this.client.query(
			`insert into public.${quote(this.table.name)} (${row.allKeys()}) values (${row.allValues()})
									on conflict (${row.primaryKeys()}) do update set ${row
										.nonPrimaryKeysArray()
										.map((k) => `${quote(k)} = excluded.${quote(k)}`)
										.join(',')}`,
			row.paramValues
		)

		if (didExist) {
			await this._onNewRow(data)
		}
	}
	async delete(data: any) {
		assert(!this.signal.aborted, 'CRUD usage outside of mutator scope')
		const row = validateAndAugmentRow(data, this.table)
		await this.client.query(
			`delete from public.${quote(this.table.name)} where ${row.primaryKeyWhereClause()}`,
			row.paramValues
		)
	}
	async update(data: any) {
		assert(!this.signal.aborted, 'CRUD usage outside of mutator scope')
		const row = validateAndAugmentRow(data, this.table)
		const res = await this.client.query(
			`update public.${quote(this.table.name)} set ${row
				.nonPrimaryKeysArray()
				.map((k) => `${quote(k)} = ${row.rowValue(k)}`)
				.join(', ')} where ${row.primaryKeyWhereClause()}`,
			row.paramValues
		)
		if (res.rowCount !== 1) {
			// might have been a noop
			const row = validateAndAugmentRow(data, this.table)
			const res = await this.client.query(
				`select count(*) from public.${quote(this.table.name)} where ${row.primaryKeyWhereClause()}`,
				row.paramValues
			)
			if (res.rows[0].count === 0) {
				throw new ZMutationError(ZErrorCode.bad_request, `update failed, no matching rows`)
			}
		}
	}
}

function validateAndAugmentRow(row: any, table: TlaSchema['tables'][keyof TlaSchema['tables']]) {
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
	const str = quote
	const paramValues = [] as any[]
	const param = (value: any) => {
		paramValues.push(value)
		return `$${paramValues.length}`
	}
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
		paramValues,
	}
}
