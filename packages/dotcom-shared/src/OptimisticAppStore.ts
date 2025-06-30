import { atom, computed, react, transact } from '@tldraw/state'
import { assert, assertExists, exhaustiveSwitchError, isEqual } from '@tldraw/utils'
import { schema } from './tlaSchema'
import { ZRowUpdate, ZStoreData } from './types'

export class OptimisticAppStore {
	private _gold_store = atom('zero store', null as null | ZStoreData, { isEqual })

	private _optimisticStore = atom<
		Array<{
			updates: ZRowUpdate[]
			mutationId: string
		}>
	>('optimistic store', [])

	epoch = 0
	constructor() {
		react('update epoch', () => {
			this._gold_store.get()
			this._optimisticStore.get()
			this.epoch++
		})
	}

	initialize(
		data: ZStoreData,
		optimisticUpdates?: Array<{ updates: ZRowUpdate[]; mutationId: string }>
	) {
		transact(() => {
			this._gold_store.set(data)
			if (optimisticUpdates) {
				this._optimisticStore.set(optimisticUpdates)
			}
		})
	}

	private store = computed(
		'store',
		() => {
			const gold = this._gold_store.get()
			if (!gold) return null
			let data = gold
			const optimistic = this._optimisticStore.get()
			for (const changes of optimistic) {
				for (const update of changes.updates) {
					data = this.applyUpdate(data, update)
				}
			}
			return data
		},
		{ isEqual }
	)

	getCommittedData() {
		return this._gold_store.get()
	}

	getOptimisticUpdates() {
		return this._optimisticStore.get()
	}

	updateCommittedData(data: ZRowUpdate) {
		this._gold_store.update((prev) => {
			if (!prev) return prev
			return this.applyUpdate(prev, data)
		})
	}

	getFullData() {
		return this.store.get()
	}

	updateOptimisticData(updates: ZRowUpdate[], mutationId: string) {
		this._optimisticStore.update((prev) => {
			if (!prev) return [{ updates, mutationId }]
			return [...prev, { updates, mutationId }]
		})
	}

	commitMutations(mutationIds: string[]) {
		this._optimisticStore.update((prev) => {
			if (!prev) return prev
			const highestIndex = prev.findLastIndex((p) => mutationIds.includes(p.mutationId))
			return prev.slice(highestIndex + 1)
		})
	}

	rejectMutation(mutationId: string) {
		this._optimisticStore.update((prev) => {
			if (!prev) return prev
			return prev.filter((p) => {
				return p.mutationId !== mutationId
			})
		})
	}

	commitLsn(lsn: string) {
		this._gold_store.update((prev) => {
			if (!prev) return prev
			return { ...prev, lsn }
		})
	}

	applyUpdate(prev: ZStoreData, update: ZRowUpdate): ZStoreData {
		const { row, table, event } = update
		const tableSchema = assertExists(schema.tables[table], 'table not found')
		const rows = prev[table]
		assert(rows, 'table not found in store ' + table)
		const matchExisting = (existing: any) =>
			tableSchema.primaryKey.every((key) => existing[key] === (row as any)[key])

		switch (event) {
			case 'insert':
				assert(!rows.some(matchExisting), 'row already exists')
				return { ...prev, [table]: [...rows, row] }
			case 'update':
				assert(rows.some(matchExisting), 'row not found')
				return {
					...prev,
					[table]: rows.map((existing) => {
						if (matchExisting(existing)) {
							return { ...existing, ...row }
						}
						return existing
					}),
				}
			case 'delete':
				return {
					...prev,
					[table]: rows.filter((existing) => !matchExisting(existing)),
				}
			default:
				exhaustiveSwitchError(event)
		}
	}
}
