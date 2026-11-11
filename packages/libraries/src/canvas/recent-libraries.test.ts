import { setInLocalStorage } from '@tldraw/editor'
import type { TLLibrary, TLLibraryId } from '../lib/schema'
import { recordRecentLibrary, sortByRecentlyAddedTo } from './recent-libraries'

const library = (id: string) => ({ id: id as TLLibraryId, name: id }) as TLLibrary
const names = (libraries: TLLibrary[]) => libraries.map(({ name }) => name)

const a = library('a')
const b = library('b')
const c = library('c')
const d = library('d')

it('keeps the source order when nothing has been added to', () => {
	expect(names(sortByRecentlyAddedTo('untouched', [a, b, c, d]))).toEqual(['a', 'b', 'c', 'd'])
})

it('puts the most recently added-to libraries first, then the rest in source order', () => {
	recordRecentLibrary('recent', c.id)
	recordRecentLibrary('recent', b.id)
	recordRecentLibrary('recent', c.id)
	expect(names(sortByRecentlyAddedTo('recent', [a, b, c, d]))).toEqual(['c', 'b', 'a', 'd'])
})

it('keeps each source to its own list', () => {
	recordRecentLibrary('one', d.id)
	expect(names(sortByRecentlyAddedTo('two', [a, b, c, d]))).toEqual(['a', 'b', 'c', 'd'])
})

it('reads the list back from storage', () => {
	setInLocalStorage('tldraw-libraries-recent:stored', JSON.stringify([d.id, a.id]))
	expect(names(sortByRecentlyAddedTo('stored', [a, b, c, d]))).toEqual(['d', 'a', 'b', 'c'])
})
