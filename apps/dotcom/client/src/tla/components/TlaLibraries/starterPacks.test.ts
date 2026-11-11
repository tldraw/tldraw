import { type LibraryPack } from '@tldraw/libraries'
import { clearLocalStorage, setInLocalStorage } from 'tldraw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	getStarterPackLibraryId,
	STARTER_PACKS,
	type StarterPackEntry,
	StarterPacksSource,
} from './starterPacks'

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

const entry = (pack: LibraryPack): StarterPackEntry => ({
	id: pack.id,
	name: pack.name,
	load: async () => pack,
})

/** A source whose packs have all arrived. */
async function loaded(...packs: LibraryPack[]) {
	const source = new StarterPacksSource(KEY, packs.map(entry))
	await source.load()
	return source
}

const KEY = 'test-added-packs'
afterEach(() => {
	clearLocalStorage()
	vi.restoreAllMocks()
})

describe('starter pack data', () => {
	it('gives every pack a unique id', () => {
		const ids = STARTER_PACKS.map((p) => p.id)
		expect(new Set(ids).size).toBe(ids.length)
	})

	it.each(STARTER_PACKS.map((p) => [p.id, p] as const))(
		'%s loads, matches its entry, and has items, each with a thumbnail',
		async (_, entry) => {
			const p = await entry.load()
			expect({ id: p.id, name: p.name }).toEqual({ id: entry.id, name: entry.name })
			expect(p.items.length).toBeGreaterThan(0)
			expect(new Set(p.items.map((item) => item.id)).size).toBe(p.items.length)
			for (const item of p.items) {
				expect(item.thumbnail, item.id).toEqual(expect.stringMatching(/^data:image\//))
			}
		}
	)
})

describe('starter packs added by reference', () => {
	it('shows only the packs the user added, in the order they added them', async () => {
		const source = await loaded(doodles, wireframing)
		expect(source.getLibraries()).toEqual([])
		source.setAdded('wireframing', true)
		source.setAdded('doodles', true)
		expect(source.getLibraries().map((library) => library.name)).toEqual(['Wireframing', 'Doodles'])
		expect(source.isAdded('doodles')).toBe(true)
	})

	it("shows a pack's items from the pack, under a library id the UI can point at", async () => {
		const source = await loaded(doodles)
		source.setAdded('doodles', true)
		const [library] = source.getLibraries()
		expect(library.id).toBe(getStarterPackLibraryId('doodles'))
		expect(library.meta).toEqual({ packId: 'doodles', packVersion: 2 })
		expect(source.getItems(library.id).map((i) => i.name)).toEqual(['Cat', 'Dog'])
	})

	it('removing a pack only drops its id', async () => {
		const source = await loaded(doodles)
		source.setAdded('doodles', true)
		source.setAdded('doodles', false)
		expect(source.getLibraries()).toEqual([])
		source.setAdded('doodles', true)
		expect(source.getItems(getStarterPackLibraryId('doodles'))).toHaveLength(2)
	})

	it('keeps the list of added packs between loads', () => {
		new StarterPacksSource(KEY, [entry(doodles)]).setAdded('doodles', true)
		expect(new StarterPacksSource(KEY, [entry(doodles)]).isAdded('doodles')).toBe(true)
	})

	it('ignores an added id whose pack no longer ships', async () => {
		setInLocalStorage(KEY, JSON.stringify(['gone', 'doodles']))
		const source = await loaded(doodles)
		expect(source.getLibraries().map((library) => library.name)).toEqual(['Doodles'])
	})

	it('refuses every change', async () => {
		const source = await loaded(doodles)
		source.setAdded('doodles', true)
		const libraryId = getStarterPackLibraryId('doodles')
		expect(source.can('renameLibrary', libraryId)).toBe(false)
		await expect(source.deleteLibrary(libraryId)).rejects.toThrow()
	})

	it('lists an added pack under its shipped name while it downloads, then fills it in', async () => {
		let arrive!: (pack: LibraryPack) => void
		const source = new StarterPacksSource(KEY, [
			{ id: 'doodles', name: 'Doodles', load: () => new Promise((resolve) => (arrive = resolve)) },
		])
		source.setAdded('doodles', true)
		const loading = source.load()
		const libraryId = getStarterPackLibraryId('doodles')
		expect(source.getLibraries()).toMatchObject([{ id: libraryId, name: 'Doodles' }])
		expect(source.isLoading(libraryId)).toBe(true)
		expect(source.getItems(libraryId)).toEqual([])

		arrive(doodles)
		await loading
		expect(source.isLoading(libraryId)).toBe(false)
		expect(source.getItems(libraryId).map((i) => i.name)).toEqual(['Cat', 'Dog'])
	})

	it('gives items the same ids every time the packs load', async () => {
		const source = await loaded(doodles, wireframing)
		const ids = source.getItems(getStarterPackLibraryId('doodles')).map((i) => i.id)
		const again = await loaded(doodles, wireframing)
		expect(again.getItems(getStarterPackLibraryId('doodles')).map((i) => i.id)).toEqual(ids)
	})

	it("hides a pack whose file didn't load", async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {})
		const source = new StarterPacksSource(KEY, [
			{ id: 'doodles', name: 'Doodles', load: () => Promise.reject(new Error('offline')) },
		])
		source.setAdded('doodles', true)
		await source.load()
		expect(source.getLibraries()).toEqual([])
		expect(source.hasFailed('doodles')).toBe(true)
	})
})
