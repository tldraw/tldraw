import { setInLocalStorage } from '@tldraw/editor'
import type { TLCollection, TLCollectionId } from '../lib/schema'
import { recordRecentCollection, sortByRecentlyAddedTo } from './recent-collections'

const collection = (id: string) => ({ id: id as TLCollectionId, name: id }) as TLCollection
const names = (collections: TLCollection[]) => collections.map(({ name }) => name)

const a = collection('a')
const b = collection('b')
const c = collection('c')
const d = collection('d')

it('keeps the source order when nothing has been added to', () => {
	expect(names(sortByRecentlyAddedTo('untouched', [a, b, c, d]))).toEqual(['a', 'b', 'c', 'd'])
})

it('puts the most recently added-to collections first, then the rest in source order', () => {
	recordRecentCollection('recent', c.id)
	recordRecentCollection('recent', b.id)
	recordRecentCollection('recent', c.id)
	expect(names(sortByRecentlyAddedTo('recent', [a, b, c, d]))).toEqual(['c', 'b', 'a', 'd'])
})

it('keeps each source to its own list', () => {
	recordRecentCollection('one', d.id)
	expect(names(sortByRecentlyAddedTo('two', [a, b, c, d]))).toEqual(['a', 'b', 'c', 'd'])
})

it('reads the list back from storage', () => {
	setInLocalStorage('tldraw-collections-recent:stored', JSON.stringify([d.id, a.id]))
	expect(names(sortByRecentlyAddedTo('stored', [a, b, c, d]))).toEqual(['d', 'a', 'b', 'c'])
})
