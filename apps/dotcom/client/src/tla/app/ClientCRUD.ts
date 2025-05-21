import { TableCRUD } from '@rocicorp/zero/out/zql/src/mutate/custom'
import { OptimisticAppStore, TlaSchema, ZRowUpdate } from '@tldraw/dotcom-shared'
import { assert, assertExists } from 'tldraw'

export class ClientCRUD implements TableCRUD<TlaSchema['tables'][keyof TlaSchema['tables']]> {
	constructor(
		private signal: AbortSignal,
		private store: OptimisticAppStore,
		private table: TlaSchema['tables'][keyof TlaSchema['tables']],
		private mutationId: string
	) {}
	private hasExisting(data: any) {
		const rows = assertExists(this.store.getFullData()?.[this.table.name], 'no data')
		return rows.some((row: any) => this.table.primaryKey.every((key) => row[key] === data[key]))
	}
	private apply(update: ZRowUpdate) {
		this.store.updateOptimisticData([update], this.mutationId)
	}
	async insert(data: any) {
		assert(!this.signal.aborted, 'CRUD usage outside of mutator scope')
		assert(!this.hasExisting(data), 'row already exists')
		this.apply({ event: 'insert', table: this.table.name, row: data })
	}
	async upsert(data: any) {
		assert(!this.signal.aborted, 'CRUD usage outside of mutator scope')
		this.apply({
			event: this.hasExisting(data) ? 'update' : 'insert',
			table: this.table.name,
			row: data,
		})
	}
	async delete(data: any) {
		assert(!this.signal.aborted, 'CRUD usage outside of mutator scope')
		this.apply({ event: 'delete', table: this.table.name, row: data })
	}
	async update(data: any) {
		assert(!this.signal.aborted, 'CRUD usage outside of mutator scope')
		assert(this.hasExisting(data), 'row not found')
		this.apply({ event: 'update', table: this.table.name, row: data })
	}
}
