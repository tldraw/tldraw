import { type LibraryPack } from '@tldraw/libraries'
import { clearLocalStorage, setInLocalStorage } from 'tldraw'
import { afterEach, describe, expect, it } from 'vitest'
import { getStarterPackLibraryId, STARTER_PACKS, StarterPacksSource } from './starterPacks'

const item = (id: string, name: string) => ({
	id,
	name,
	content: {
		formatVersion: 1,
		content: { shapes: [], bindings: [], rootShapeIds: [], assets: [], schema: {} },
	},
	thumbnail: 'data:image/webp;base64,AAAA',
})

const doodles = {
	id: 'doodles',
	name: 'Doodles',
	version: 2,
	items: [item('cat', 'Cat'), item('dog', 'Dog')],
} as unknown as LibraryPack
const wireframing = {
	id: 'wireframing',
	name: 'Wireframing',
	version: 1,
	items: [item('button', 'Button')],
} as unknown as LibraryPack

const KEY = 'test-added-packs'
afterEach(() => clearLocalStorage())

describe('starter pack data', () => {
	it('gives every pack a unique id', () => {
		const ids = STARTER_PACKS.map((p) => p.id)
		expect(new Set(ids).size).toBe(ids.length)
	})

	it.each(STARTER_PACKS.map((p) => [p.id, p] as const))(
		'%s has items, each with a thumbnail',
		(_, p) => {
			expect(p.items.length).toBeGreaterThan(0)
			expect(new Set(p.items.map((item) => item.id)).size).toBe(p.items.length)
			for (const item of p.items) {
				expect(item.thumbnail, item.id).toEqual(expect.stringMatching(/^data:image\//))
			}
		}
	)
})

describe('starter packs added by reference', () => {
	it('shows only the packs the user added, in the order they added them', () => {
		const source = new StarterPacksSource(KEY, [doodles, wireframing])
		expect(source.getLibraries()).toEqual([])
		source.setAdded('wireframing', true)
		source.setAdded('doodles', true)
		expect(source.getLibraries().map((library) => library.name)).toEqual(['Wireframing', 'Doodles'])
		expect(source.isAdded('doodles')).toBe(true)
	})

	it("shows a pack's items from the pack, under a library id the UI can point at", () => {
		const source = new StarterPacksSource(KEY, [doodles])
		source.setAdded('doodles', true)
		const [library] = source.getLibraries()
		expect(library.id).toBe(getStarterPackLibraryId('doodles'))
		expect(library.meta).toEqual({ packId: 'doodles', packVersion: 2 })
		expect(source.getItems(library.id).map((i) => i.name)).toEqual(['Cat', 'Dog'])
	})

	it('removing a pack only drops its id', () => {
		const source = new StarterPacksSource(KEY, [doodles])
		source.setAdded('doodles', true)
		source.setAdded('doodles', false)
		expect(source.getLibraries()).toEqual([])
		source.setAdded('doodles', true)
		expect(source.getItems(getStarterPackLibraryId('doodles'))).toHaveLength(2)
	})

	it('keeps the list of added packs between loads', () => {
		new StarterPacksSource(KEY, [doodles]).setAdded('doodles', true)
		expect(new StarterPacksSource(KEY, [doodles]).isAdded('doodles')).toBe(true)
	})

	it('ignores an added id whose pack no longer ships', () => {
		setInLocalStorage(KEY, JSON.stringify(['gone', 'doodles']))
		const source = new StarterPacksSource(KEY, [doodles])
		expect(source.getLibraries().map((library) => library.name)).toEqual(['Doodles'])
	})

	it('refuses every change', async () => {
		const source = new StarterPacksSource(KEY, [doodles])
		source.setAdded('doodles', true)
		const libraryId = getStarterPackLibraryId('doodles')
		expect(source.can('renameLibrary', libraryId)).toBe(false)
		await expect(source.deleteLibrary(libraryId)).rejects.toThrow()
	})
})
