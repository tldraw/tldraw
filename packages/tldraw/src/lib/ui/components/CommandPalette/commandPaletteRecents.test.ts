import { deleteFromLocalStorage, setInLocalStorage } from '@tldraw/editor'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	addCommandPaletteRecent,
	getCommandPaletteRecents,
	MAX_COMMAND_PALETTE_RECENTS,
	MAX_STORED_COMMAND_PALETTE_RECENTS,
} from './commandPaletteRecents'

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

	it('keeps more ids than it shows, up to the stored max', () => {
		const ids = Array.from({ length: MAX_STORED_COMMAND_PALETTE_RECENTS + 1 }, (_, i) => `${i}`)
		for (const id of ids) addCommandPaletteRecent(id)
		expect(getCommandPaletteRecents()).toEqual(
			ids.reverse().slice(0, MAX_STORED_COMMAND_PALETTE_RECENTS)
		)
		expect(MAX_STORED_COMMAND_PALETTE_RECENTS).toBeGreaterThan(MAX_COMMAND_PALETTE_RECENTS)
	})

	it('caps an over-long stored list on read', () => {
		const ids = Array.from({ length: MAX_STORED_COMMAND_PALETTE_RECENTS + 5 }, (_, i) => `${i}`)
		setInLocalStorage(KEY, JSON.stringify(ids))
		expect(getCommandPaletteRecents()).toEqual(ids.slice(0, MAX_STORED_COMMAND_PALETTE_RECENTS))
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
