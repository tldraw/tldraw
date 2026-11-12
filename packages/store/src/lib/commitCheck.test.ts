import { transact } from '@tldraw/state'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BaseRecord, RecordId } from './BaseRecord'
import { RecordsDiff } from './RecordsDiff'
import { createRecordType } from './RecordType'
import { Store } from './Store'
import { StoreSchema } from './StoreSchema'

interface Book extends BaseRecord<'book', RecordId<Book>> {
	title: string
}
interface Author extends BaseRecord<'author', RecordId<Author>> {
	name: string
}
const Book = createRecordType<Book>('book', {
	validator: { validate: (book) => book as Book },
	scope: 'document',
})
const Author = createRecordType<Author>('author', {
	validator: { validate: (author) => author as Author },
	scope: 'document',
})
type Library = Book | Author

const book = Book.create({ id: Book.createId('a'), title: 'a' })
const author = Author.create({ id: Author.createId('b'), name: 'b' })

let store: Store<Library>
beforeEach(() => {
	store = new Store({
		props: {},
		schema: StoreSchema.create<Library>({ book: Book, author: Author }),
	})
})

const ids = (diff: RecordsDiff<Library>) => ({
	added: Object.keys(diff.added).sort(),
	updated: Object.keys(diff.updated).sort(),
	removed: Object.keys(diff.removed).sort(),
})

describe('commit checks', () => {
	it('see the whole operation once side effects have settled, including late handlers', () => {
		const seen: RecordsDiff<Library>[] = []
		store.addCommitCheck((changes) => (seen.push(changes), null))
		// registered after the check, and writes more records from operation-complete
		let wrote = false
		store.sideEffects.registerOperationCompleteHandler(() => {
			if (wrote) return
			wrote = true
			store.put([author])
		})
		store.put([book])
		expect(seen.map(ids)).toEqual([{ added: [author.id, book.id], updated: [], removed: [] }])
	})

	it('runs once per outermost operation, not per nested write', () => {
		const check = vi.fn(() => null)
		store.addCommitCheck(check)
		store.atomic(() => {
			store.put([book])
			store.put([author])
		})
		expect(check).toHaveBeenCalledTimes(1)
	})

	it('revert a refused operation whole, then tell the check', () => {
		store.put([book])
		const afterRevert = vi.fn(() => {
			expect(store.get(author.id)).toBeUndefined()
		})
		store.addCommitCheck(() => ({ afterRevert }))
		store.atomic(() => {
			store.put([author])
			store.update(book.id, (b) => ({ ...b, title: 'changed' }))
			store.remove([book.id])
		})
		expect(store.get(book.id)).toEqual(book)
		expect(store.get(author.id)).toBeUndefined()
		expect(afterRevert).toHaveBeenCalledTimes(1)
	})

	it('leave nothing for listeners or history interceptors to apply after a refusal', () => {
		store.put([book])
		const listener = vi.fn()
		store.listen(listener, { scope: 'document' })
		const squashed: RecordsDiff<Library>[] = []
		store.addHistoryInterceptor((entry) => squashed.push(entry.changes))
		store.addCommitCheck(() => ({}))
		store.update(book.id, (b) => ({ ...b, title: 'changed' }))
		store.put([author])
		store._flushHistory()
		// whatever reached them must net out to the store as it was
		const applied = new Store({
			props: {},
			schema: StoreSchema.create<Library>({ book: Book, author: Author }),
		})
		applied.put([book])
		for (const diff of squashed) applied.applyDiff(diff)
		expect(applied.serialize('document')).toEqual(store.serialize('document'))
	})

	it('never check remote changes', () => {
		const check = vi.fn(() => ({}))
		store.addCommitCheck(check)
		store.mergeRemoteChanges(() => store.put([book]))
		expect(check).not.toHaveBeenCalled()
		expect(store.get(book.id)).toEqual(book)
	})

	it('stop checking once removed', () => {
		const remove = store.addCommitCheck(() => ({}))
		remove()
		store.put([book])
		expect(store.get(book.id)).toEqual(book)
	})

	it('check a scope as one operation, once, with every store operation inside it', () => {
		const seen: RecordsDiff<Library>[] = []
		store.addCommitCheck((changes) => (seen.push(changes), null))
		store.checkAsOneOperation(() => {
			store.put([book])
			store.put([author])
		})
		expect(seen.map(ids)).toEqual([{ added: [author.id, book.id], updated: [], removed: [] }])
	})

	it('revert every store operation of a refused scope', () => {
		store.put([book])
		store.addCommitCheck((changes) => (author.id in changes.added ? {} : null))
		store.checkAsOneOperation(() => {
			store.update(book.id, (b) => ({ ...b, title: 'changed' }))
			store.put([author])
		})
		expect(store.get(book.id)).toEqual(book)
		expect(store.get(author.id)).toBeUndefined()
	})

	it("keep a scope's changes from listeners until its check has run", () => {
		const heard: string[] = []
		store.listen(({ changes }) => heard.push(...Object.keys(changes.added)), { scope: 'document' })
		store.addCommitCheck((changes) => (author.id in changes.added ? {} : null))
		store.checkAsOneOperation(() => {
			// an editor `run` is a transaction, so the history reactor fires when it ends
			transact(() => store.put([author]))
			// and anything may flush history by hand
			store._flushHistory()
		})
		store._flushHistory()
		expect(heard).toEqual([])

		store.checkAsOneOperation(() => store.put([book]))
		store._flushHistory()
		expect(heard).toEqual([book.id])
	})

	it('report how each checked operation settled, before the check hears of a refusal', () => {
		const order: string[] = []
		store.onCheckedOperationSettled((outcome) => order.push(outcome))
		store.addCommitCheck((changes) =>
			author.id in changes.added ? { afterRevert: () => order.push('afterRevert') } : null
		)
		store.put([book])
		store.put([author])
		// remote and unchecked writes aren't checked operations
		store.mergeRemoteChanges(() => store.update(book.id, (b) => ({ ...b, title: 'remote' })))
		store.runUnchecked(() => store.update(book.id, (b) => ({ ...b, title: 'unchecked' })))
		expect(order).toEqual(['accepted', 'refused', 'afterRevert'])
	})

	it('settle an operation that throws as aborted, after it rolled back, without checking it', () => {
		const order: string[] = []
		const check = vi.fn(() => null)
		store.addCommitCheck(check)
		store.onCheckedOperationSettled((outcome) => order.push(`${outcome}:${store.has(book.id)}`))
		expect(() =>
			store.atomic(() => {
				store.put([book])
				throw new Error('boom')
			})
		).toThrow('boom')
		expect(() =>
			store.checkAsOneOperation(() => {
				store.put([book])
				throw new Error('boom')
			})
		).toThrow('boom')
		expect(order).toEqual(['aborted:false', 'aborted:false'])
		expect(check).not.toHaveBeenCalled()
		// the store keeps working, and checks the next operation
		store.put([book])
		expect(check).toHaveBeenCalledTimes(1)
	})

	it('roll back a unit that throws inside an outer transaction, and only that unit', () => {
		const outcomes: string[] = []
		store.addCommitCheck(() => null)
		store.onCheckedOperationSettled((outcome) => outcomes.push(outcome))
		transact(() => {
			store.put([author])
			try {
				store.checkAsOneOperation(() => {
					store.put([book])
					throw new Error('boom')
				})
			} catch {
				// the caller recovers and the outer transaction carries on
			}
		})
		expect([store.has(author.id), store.has(book.id)]).toEqual([true, false])
		expect(outcomes).toEqual(['accepted', 'aborted'])
	})
})
