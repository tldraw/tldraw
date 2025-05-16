import { TableCRUD } from '@rocicorp/zero/out/zql/src/mutate/custom'
import { TlaSchema, ZErrorCode } from '@tldraw/dotcom-shared'
import { assert } from '@tldraw/utils'
import { PoolClient } from 'pg'
import { parseRow } from '../postgres'
import { ZMutationError } from './ZMutationError'

export class ServerCRUD implements TableCRUD<TlaSchema['tables'][keyof TlaSchema['tables']]> {
	constructor(
		private readonly client: PoolClient,
		private readonly table: TlaSchema['tables'][keyof TlaSchema['tables']],
		private readonly signal: AbortSignal
	) {}
	async insert(data: any) {
		assert(!this.signal.aborted, 'missing await in mutator')
		const row = parseRow(data, this.table)
		await this.client.query(
			`insert into public."${this.table.name}" (${row.allKeys()}) values (${row.allValues()})`,
			row.paramValues
		)
	}
	async upsert(data: any) {
		assert(!this.signal.aborted, 'missing await in mutator')
		const row = parseRow(data, this.table)
		await this.client.query(
			`insert into public."${this.table.name}" (${row.allKeys()}) values (${row.allValues()})
									on conflict (${row.primaryKeys()}) do update set ${row
										.nonPrimaryKeysArray()
										.map((k) => `"${k}" = excluded."${k}"`)
										.join(',')}`,
			row.paramValues
		)
	}
	async delete(data: any) {
		assert(!this.signal.aborted, 'missing await in mutator')
		const row = parseRow(data, this.table)
		await this.client.query(
			`delete from public."${this.table.name}" where ${row.primaryKeyWhereClause()}`,
			row.paramValues
		)
	}
	async update(data: any) {
		assert(!this.signal.aborted, 'missing await in mutator')
		const row = parseRow(data, this.table)
		const res = await this.client.query(
			`update public.${this.table.name} set ${row
				.nonPrimaryKeysArray()
				.map((k) => `${JSON.stringify(k)} = ${row.rowValue(k)}`)
				.join(', ')} where ${row.primaryKeyWhereClause()}`,
			row.paramValues
		)
		if (res.rowCount !== 1) {
			// might have been a noop
			const row = parseRow(data, this.table)
			const res = await this.client.query(
				`select count(*) from public.${this.table.name} where ${row.primaryKeyWhereClause()}`,
				row.paramValues
			)
			if (res.rows[0].count === 0) {
				throw new ZMutationError(ZErrorCode.bad_request, `update failed, no matching rows`)
			}
		}
	}
}
