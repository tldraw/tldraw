import { TlaRow, TlaSchema } from '@tldraw/dotcom-shared'
import { assert } from '@tldraw/utils'
import { PoolClient } from 'pg'

export class ServerQuery<Row extends TlaRow, isOne extends boolean = false> {
	constructor(
		private readonly signal: AbortSignal,
		private readonly client: PoolClient,
		private readonly isOne: isOne,
		private readonly table: keyof TlaSchema['tables'],
		private readonly wheres: readonly string[] = [],
		private readonly params: readonly unknown[] = [],
		private readonly p = 1
	) {}

	where<K extends keyof Row>(key: K, op: '=', value: Row[K]) {
		assert(op === '=', 'Only = operator is supported')
		return new ServerQuery<Row, isOne>(
			this.signal,
			this.client,
			this.isOne,
			this.table,
			[...this.wheres, `${JSON.stringify(key)} ${op} $${this.p}`],
			[...this.params, value],
			this.p + 1
		)
	}

	async run(): Promise<isOne extends true ? Row : Row[]> {
		assert(!this.signal.aborted, 'Query usage outside of mutator scope')
		const whereClause = this.wheres.length > 0 ? `WHERE ${this.wheres.join(' AND ')}` : ''
		const sql = `SELECT * FROM "${this.table}" ${whereClause}`
		const res = await this.client.query(sql, [...this.params])
		if (this.isOne) {
			return res.rows[0] as any
		}
		return res.rows as any
	}

	one() {
		return new ServerQuery<Row, true>(
			this.signal,
			this.client,
			true,
			this.table,
			this.wheres,
			this.params,
			this.p
		)
	}
}
