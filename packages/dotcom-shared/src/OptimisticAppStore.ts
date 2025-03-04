import { atom, computed, react, transact } from '@tldraw/state'
import { assert } from '@tldraw/utils'
import isEqual from 'lodash.isequal'
import {
	TlaFile,
	TlaFilePartial,
	TlaFileState,
	TlaFileStatePartial,
	TlaUser,
	TlaUserPartial,
} from './tlaSchema'
import { ZRowUpdate, ZStoreData } from './types'

export class OptimisticAppStore {
	private _gold_store = atom('zero store', null as null | ZStoreData, {
		isEqual: isEqual,
	})

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

	private store = computed('store', () => {
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
	})

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

	applyUpdate(prev: ZStoreData, update: ZRowUpdate) {
		const { row, table, event } = update
		if (table === 'user') {
			if (event === 'update') {
				const { id: _id, ...rest } = row as TlaUserPartial
				return { ...prev, user: { ...prev.user, ...rest } }
			} else {
				return { ...prev, user: row as TlaUser }
			}
		}
		if (table === 'file') {
			if (event === 'delete') {
				return {
					...prev,
					files: prev.files.filter((f) => f.id !== (row as TlaFile).id),
				}
			} else if (event === 'update') {
				const { id, ...rest } = row as TlaFilePartial
				return {
					...prev,
					files: prev.files.map((f) => (f.id === id ? ({ ...f, ...rest } as TlaFile) : f)),
				}
			} else {
				assert(event === 'insert', 'invalid event')
				return {
					...prev,
					files: [...prev.files, row as TlaFile],
				}
			}
		}
		assert(table === 'file_state')
		const { fileId, userId, ...rest } = row as TlaFileStatePartial
		if (event === 'delete') {
			return {
				...prev,
				fileStates: prev.fileStates.filter((f) => !(f.fileId === fileId && f.userId === userId)),
			}
		} else if (event === 'update') {
			return {
				...prev,
				fileStates: prev.fileStates.map((f) => {
					if (f.fileId === fileId && f.userId === userId) {
						return { ...f, ...rest }
					}
					return f
				}),
			}
		} else {
			assert(event === 'insert', 'invalid event')
			return {
				...prev,
				fileStates: [...prev.fileStates, row as TlaFileState],
			}
		}
	}
}
