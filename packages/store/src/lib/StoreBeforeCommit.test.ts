import { transact, transaction } from '@tldraw/state'
import { beforeEach, describe, expect, it } from 'vitest'
import { BaseRecord, RecordId } from './BaseRecord'
import { RecordsDiff } from './RecordsDiff'
import { createRecordType } from './RecordType'
import { Store } from './Store'
import { StoreSchema } from './StoreSchema'

// Tests for SPEC.md §8, rule H15.

interface Book extends BaseRecord<'book', RecordId<Book>> {
	title: string
}
const Book = createRecordType<Book>('book', {
	validator: { validate: (book) => book as Book },
	scope: 'document',
})
const a = Book.create({ id: Book.createId('a'), title: 'a' })
const b = Book.create({ id: Book.createId('b'), title: 'b' })
const c = Book.create({ id: Book.createId('c'), title: 'c' })

let store: Store<Book>
let commits: RecordsDiff<Book>[]
beforeEach(() => {
	store = new Store({ props: {}, schema: StoreSchema.create<Book>({ book: Book }) })
	store.put([a])
	commits = []
	store.onBeforeCommit((changes) => commits.push(changes))
})

const diff = (changes: Partial<RecordsDiff<Book>>) => ({
	added: {},
	updated: {},
	removed: {},
	...changes,
})
const boom = () => {
	throw new Error('boom')
}
// writes `c` whenever `b` is created, the way a side effect would
const createCWithB = () =>
	store.sideEffects.registerAfterCreateHandler('book', (book) => {
		if (book.id === b.id) store.put([c])
	})

describe('onBeforeCommit [H15]', () => {
	it.each<[string, () => void, Partial<RecordsDiff<Book>>[]]>([
		[
			'several writes in one transaction as one diff',
			() =>
				transact(() => {
					store.put([b])
					store.update(a.id, (r) => ({ ...r, title: 'a2' }))
					store.update(a.id, (r) => ({ ...r, title: 'a3' }))
				}),
			[{ added: { [b.id]: b }, updated: { [a.id]: [a, { ...a, title: 'a3' }] } }],
		],
		[
			'separate writes as separate diffs',
			() => {
				store.put([b])
				store.remove([a.id])
			},
			[{ added: { [b.id]: b } }, { removed: { [a.id]: a } }],
		],
		[
			'what side effects wrote, with the write that caused it',
			() => {
				createCWithB()
				store.put([b])
			},
			[{ added: { [b.id]: b, [c.id]: c } }],
		],
		[
			'what a history interceptor wrote, with the write that caused it',
			() => {
				store.addHistoryInterceptor((entry) => {
					if (entry.changes.added[b.id]) store.put([c])
				})
				store.put([b])
			},
			[{ added: { [b.id]: b, [c.id]: c } }],
		],
		[
			'nothing for a transaction that throws',
			() => expect(() => transact(() => (store.put([b]), boom()))).toThrow('boom'),
			[],
		],
		[
			'nothing from a nested transaction that rolled back',
			() =>
				transaction(() => {
					store.put([b])
					transaction((rollback) => (store.put([c]), rollback()))
				}),
			[{ added: { [b.id]: b } }],
		],
		[
			'nothing from a nested transaction that rolled back, when a remote change follows it',
			() =>
				transaction(() => {
					store.put([b])
					transaction((rollback) => (store.put([c]), rollback()))
					store.mergeRemoteChanges(() => store.update(a.id, (r) => ({ ...r, title: 'remote' })))
				}),
			[{ added: { [b.id]: b } }],
		],
		[
			'nothing for remote changes or what side effects write in response',
			() => {
				createCWithB()
				store.mergeRemoteChanges(() => store.put([b]))
			},
			[],
		],
		[
			'user changes made after a remote merge in the same transaction',
			() =>
				transact(() => {
					createCWithB()
					store.mergeRemoteChanges(() => store.update(a.id, (r) => ({ ...r, title: 'remote' })))
					store.put([b])
				}),
			[{ added: { [b.id]: b, [c.id]: c } }],
		],
		[
			'nothing when the changes cancel out',
			() => transact(() => (store.put([b]), store.remove([b.id]))),
			[],
		],
	])('reports %s', (_name, run, expected) => {
		run()
		expect(commits).toEqual(expected.map(diff))
	})

	it('reports before the transaction commits, and again for what a listener writes', () => {
		const seen: string[] = []
		store.listen(() => seen.push('listener'))
		store.onBeforeCommit((changes) => {
			seen.push('commit')
			if (changes.added[b.id]) store.put([c])
		})

		store.put([b])
		store._flushHistory()

		expect(seen).toEqual(['commit', 'commit', 'listener'])
		expect(commits).toEqual([diff({ added: { [b.id]: b } }), diff({ added: { [c.id]: c } })])
	})

	it('stops reporting once the listener is removed', () => {
		const calls: unknown[] = []
		const remove = store.onBeforeCommit((changes) => calls.push(changes))
		remove()
		store.put([b])
		expect(calls).toEqual([])
	})
})
