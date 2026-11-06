import { describe, expect, it } from 'vitest'
import { BaseRecord, RecordId } from '../BaseRecord'
import { createRecordType } from '../RecordType'
import { Store } from '../Store'
import { StoreSchema } from '../StoreSchema'

interface Book extends BaseRecord<'book', RecordId<Book>> {
	title: string
	locked: boolean
}
const Book = createRecordType<Book>('book', {
	validator: { validate: (b) => b as Book },
	scope: 'document',
}).withDefaultProperties(() => ({ locked: false }))

function makeStore() {
	const store = new Store({ schema: StoreSchema.create<Book>({ book: Book }), props: {} })
	const a = Book.create({ id: Book.createId('a'), title: 'A' })
	store.put([a])
	return { store, a }
}

describe('Store.setWriteGuard', () => {
	it('rolls back the whole operation when the guard says no', () => {
		const { store, a } = makeStore()
		const seen: number[] = []
		store.setWriteGuard((diff) => {
			seen.push(Object.keys(diff.added).length + Object.keys(diff.updated).length)
			return !Object.values(diff.updated).some(([, to]) => to.title === 'forbidden')
		})
		const listened: string[] = []
		store.listen((e) => listened.push(JSON.stringify(e.changes)), { source: 'user' })
		const intercepted: number[] = []
		store.addHistoryInterceptor(() => intercepted.push(1))

		store.atomic(() => {
			store.put([Book.create({ id: Book.createId('b'), title: 'B' })])
			store.put([{ ...a, title: 'forbidden' }])
		})
		expect(store.get(a.id)!.title).toBe('A')
		expect(store.get(Book.createId('b'))).toBeUndefined()
		expect(seen).toEqual([2])
		store._flushHistory()
		expect(listened).toEqual([])
		expect(intercepted).toEqual([])

		store.put([{ ...a, title: 'fine' }])
		store._flushHistory()
		expect(store.get(a.id)!.title).toBe('fine')
		expect(listened).toHaveLength(1)
		expect(intercepted).toEqual([1])
	})

	it('sees changes made by side effects as part of the operation', () => {
		const { store, a } = makeStore()
		store.sideEffects.registerAfterChangeHandler('book', (_prev, next) => {
			if (next.title === 'lock me' && !next.locked) store.put([{ ...next, locked: true }])
		})
		store.setWriteGuard((diff) => !Object.values(diff.updated).some(([, to]) => to.locked))
		store.put([{ ...a, title: 'lock me' }])
		expect(store.get(a.id)).toEqual(a)
	})

	it('never checks remote changes', () => {
		const { store, a } = makeStore()
		store.setWriteGuard(() => false)
		store.mergeRemoteChanges(() => store.put([{ ...a, title: 'remote' }]))
		expect(store.get(a.id)!.title).toBe('remote')
		store.put([{ ...a, title: 'local' }])
		expect(store.get(a.id)!.title).toBe('remote')
	})
})
