import { setInLocalStorage } from '@tldraw/editor'
import type { TLLibraryId } from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import {
	getToolbarLibraryIds,
	putLibraryInToolbar,
	removeLibraryFromToolbar,
} from './toolbar-libraries'

const source = (id: string) => ({ id }) as LibrarySource
const a = 'library:a' as TLLibraryId
const b = 'library:b' as TLLibraryId

it('starts empty', () => {
	expect(getToolbarLibraryIds(source('empty'))).toEqual([])
})

it('keeps libraries in the order they were put in, once each', () => {
	const s = source('order')
	putLibraryInToolbar(s, b)
	putLibraryInToolbar(s, a)
	putLibraryInToolbar(s, b)
	expect(getToolbarLibraryIds(s)).toEqual([b, a])
	removeLibraryFromToolbar(s, b)
	expect(getToolbarLibraryIds(s)).toEqual([a])
})

it('keeps each source to its own toolbar', () => {
	putLibraryInToolbar(source('one'), a)
	expect(getToolbarLibraryIds(source('two'))).toEqual([])
})

it('reads the toolbar back from storage', () => {
	setInLocalStorage('tldraw-libraries-toolbar:stored', JSON.stringify([b, a]))
	expect(getToolbarLibraryIds(source('stored'))).toEqual([b, a])
})
