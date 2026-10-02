import { deleteFromLocalStorage, setInLocalStorage } from '@tldraw/editor'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { addCommandPaletteRecent, getCommandPaletteRecents } from './commandPaletteRecents'

const KEY = 'tldraw-command-palette-recents'

afterEach(() => {
	vi.restoreAllMocks()
	deleteFromLocalStorage(KEY)
})

describe('command palette recents', () => {
	it('starts empty', () => {
		expect(getCommandPaletteRecents()).toEqual([])
	})

	it('puts the latest id first without duplicates', () => {
		addCommandPaletteRecent('a')
		addCommandPaletteRecent('b')
		addCommandPaletteRecent('a')
		expect(getCommandPaletteRecents()).toEqual(['a', 'b'])
	})

	it('keeps at most five ids', () => {
		for (const id of ['1', '2', '3', '4', '5', '6']) addCommandPaletteRecent(id)
		expect(getCommandPaletteRecents()).toEqual(['6', '5', '4', '3', '2'])
	})

	it('ignores corrupt values', () => {
		setInLocalStorage(KEY, '{not json')
		expect(getCommandPaletteRecents()).toEqual([])
		setInLocalStorage(KEY, JSON.stringify(['a', 3, null]))
		expect(getCommandPaletteRecents()).toEqual(['a'])
	})

	it('survives storage that throws', () => {
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new Error('denied')
		})
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('denied')
		})
		expect(() => addCommandPaletteRecent('a')).not.toThrow()
		expect(getCommandPaletteRecents()).toEqual([])
	})
})
