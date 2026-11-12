import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { librariesPanelOpen, type LibraryPack } from '@tldraw/libraries'
import {
	clearLocalStorage,
	createTLStore,
	defaultBindingUtils,
	defaultShapeUtils,
	Editor,
	setInLocalStorage,
} from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	getStarterPackLibraryId,
	refreshStarterPacksWhenSeen,
	type StarterPackEntry,
	type StarterPacksCatalog,
	StarterPacksSource,
} from './starterPacks'

const item = (id: string, name: string): LibraryPack['items'][number] => ({
	id,
	name,
	content: {
		formatVersion: 1,
		content: { shapes: [], bindings: [], rootShapeIds: [], assets: [], schema: {} },
	} as unknown as LibraryPack['items'][number]['content'],
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

const toEntry = ({ id, name, version }: LibraryPack): StarterPackEntry => ({ id, name, version })

/** Serves `packs` the way `public/libraries/` does; `publish` replaces them, like a deploy. */
function fakeCatalog(...packs: LibraryPack[]) {
	let served = packs
	const catalog = {
		publish: (...next: LibraryPack[]) => (served = next),
		getEntries: vi.fn(async () => served.map(toEntry)),
		getPack: vi.fn(async (entry: StarterPackEntry) => {
			const pack = served.find((p) => p.id === entry.id)
			if (!pack) throw new Error(`No pack ${entry.id}`)
			return pack
		}),
	} satisfies StarterPacksCatalog & { publish: unknown }
	return catalog
}

/** A source whose packs have all arrived. */
async function loaded(...packs: LibraryPack[]) {
	const source = new StarterPacksSource(KEY, fakeCatalog(...packs))
	await source.refresh()
	return source
}

const KEY = 'test-added-packs'
afterEach(() => {
	clearLocalStorage()
	vi.restoreAllMocks()
})

describe('starter pack files', () => {
	const dir = resolve(__dirname, '../../../../public/libraries')
	const read = (name: string) => JSON.parse(readFileSync(resolve(dir, name), 'utf8'))
	const entries: StarterPackEntry[] = read('packs.json')

	it('lists every pack once', () => {
		const ids = entries.map((p) => p.id)
		expect(new Set(ids).size).toBe(ids.length)
	})

	it.each(entries.map((entry) => [entry.id, entry] as const))(
		'%s matches its packs.json entry and has items, each with a thumbnail',
		(id, entry) => {
			const pack: LibraryPack = read(`${id}.json`)
			expect(toEntry(pack)).toEqual(entry)
			expect(pack.items.length).toBeGreaterThan(0)
			expect(new Set(pack.items.map((item) => item.id)).size).toBe(pack.items.length)
			for (const item of pack.items) {
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
		new StarterPacksSource(KEY, fakeCatalog(doodles)).setAdded('doodles', true)
		expect(new StarterPacksSource(KEY, fakeCatalog(doodles)).isAdded('doodles')).toBe(true)
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

	it('gives items the same ids every time the packs load', async () => {
		const ids = (await loaded(doodles))
			.getItems(getStarterPackLibraryId('doodles'))
			.map((i) => i.id)
		const again = await loaded(doodles)
		expect(again.getItems(getStarterPackLibraryId('doodles')).map((i) => i.id)).toEqual(ids)
	})
})

describe('loading and updating starter packs', () => {
	it('lists an added pack under its packs.json name while it downloads, then fills it in', async () => {
		let arrive!: (pack: LibraryPack) => void
		const catalog = fakeCatalog(doodles)
		catalog.getPack.mockImplementation(() => new Promise((resolve) => (arrive = resolve)))
		const source = new StarterPacksSource(KEY, catalog)
		source.setAdded('doodles', true)
		const refreshing = source.refresh()
		await vi.waitFor(() => expect(catalog.getPack).toHaveBeenCalled())
		const libraryId = getStarterPackLibraryId('doodles')
		expect(source.getLibraries()).toMatchObject([{ id: libraryId, name: 'Doodles' }])
		expect(source.isLoading(libraryId)).toBe(true)
		expect(source.getItems(libraryId)).toEqual([])

		arrive(doodles)
		await refreshing
		expect(source.isLoading(libraryId)).toBe(false)
		expect(source.getItems(libraryId).map((i) => i.name)).toEqual(['Cat', 'Dog'])
	})

	it('swaps in a new version on refresh, and fetches only the packs that changed', async () => {
		const catalog = fakeCatalog(doodles, wireframing)
		const source = new StarterPacksSource(KEY, catalog)
		await source.refresh()
		source.setAdded('doodles', true)

		const doodles3 = { ...doodles, version: 3, items: [...doodles.items, item('owl', 'Owl')] }
		catalog.publish(doodles3, wireframing)
		catalog.getPack.mockClear()
		await source.refresh()

		expect(catalog.getPack.mock.calls.map(([entry]) => entry.id)).toEqual(['doodles'])
		const libraryId = getStarterPackLibraryId('doodles')
		expect(source.getLibraries()[0].meta).toEqual({ packId: 'doodles', packVersion: 3 })
		expect(source.getItems(libraryId).map((i) => i.name)).toEqual(['Cat', 'Dog', 'Owl'])
	})

	it('keeps showing the old version while the new one downloads, and if it fails', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {})
		const catalog = fakeCatalog(doodles)
		const source = new StarterPacksSource(KEY, catalog)
		await source.refresh()
		source.setAdded('doodles', true)
		const libraryId = getStarterPackLibraryId('doodles')

		catalog.publish({ ...doodles, version: 3 })
		catalog.getPack.mockRejectedValueOnce(new Error('offline'))
		await source.refresh()
		expect(source.isLoading(libraryId)).toBe(false)
		expect(source.getItems(libraryId)).toHaveLength(2)

		await source.refresh()
		expect(source.getLibraries()[0].meta).toEqual({ packId: 'doodles', packVersion: 3 })
	})

	it('hides a pack whose file never arrived, and tries again on the next refresh', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {})
		const catalog = fakeCatalog(doodles)
		catalog.getPack.mockRejectedValueOnce(new Error('offline'))
		const source = new StarterPacksSource(KEY, catalog)
		source.setAdded('doodles', true)
		await source.refresh()
		expect(source.getLibraries()).toEqual([])
		expect(source.hasFailed('doodles')).toBe(true)

		await source.refresh()
		expect(source.getLibraries().map((library) => library.name)).toEqual(['Doodles'])
	})

	it('keeps what it has when packs.json fails to load', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {})
		const catalog = fakeCatalog(doodles)
		const source = new StarterPacksSource(KEY, catalog)
		await source.refresh()
		source.setAdded('doodles', true)
		catalog.getEntries.mockRejectedValueOnce(new Error('offline'))
		await source.refresh()
		expect(source.getItems(getStarterPackLibraryId('doodles'))).toHaveLength(2)
	})

	it('shares one refresh between calls made while it runs', async () => {
		const catalog = fakeCatalog(doodles)
		const source = new StarterPacksSource(KEY, catalog)
		await Promise.all([source.refresh(), source.refresh()])
		expect(catalog.getEntries).toHaveBeenCalledTimes(1)
	})
})

describe('refreshing while the tab stays open', () => {
	let editor: Editor
	beforeEach(() => {
		editor = new Editor({
			store: createTLStore({ shapeUtils: defaultShapeUtils }),
			shapeUtils: defaultShapeUtils,
			bindingUtils: defaultBindingUtils,
			tools: [],
			getContainer: () => document.body,
		})
	})
	afterEach(() => editor.dispose())

	const focusWindow = () => window.dispatchEvent(new Event('focus'))

	it('refreshes when the libraries panel opens and when the window comes back into focus', () => {
		const source = new StarterPacksSource(KEY, fakeCatalog(doodles))
		const refresh = vi.spyOn(source, 'refresh').mockResolvedValue()
		const stop = refreshStarterPacksWhenSeen(editor, source)
		expect(refresh).not.toHaveBeenCalled()

		librariesPanelOpen.set(editor, true)
		expect(refresh).toHaveBeenCalledTimes(1)
		librariesPanelOpen.set(editor, false)
		expect(refresh).toHaveBeenCalledTimes(1)
		focusWindow()
		expect(refresh).toHaveBeenCalledTimes(2)

		stop()
		focusWindow()
		librariesPanelOpen.set(editor, true)
		expect(refresh).toHaveBeenCalledTimes(2)
	})

	it('shows a pack deployed after the tab opened once the window comes back into focus', async () => {
		const catalog = fakeCatalog(doodles)
		const source = new StarterPacksSource(KEY, catalog)
		await source.refresh()
		source.setAdded('doodles', true)
		const stop = refreshStarterPacksWhenSeen(editor, source)

		catalog.publish({ ...doodles, version: 3, items: [...doodles.items, item('owl', 'Owl')] })
		focusWindow()
		await vi.waitFor(() =>
			expect(source.getItems(getStarterPackLibraryId('doodles')).map((i) => i.name)).toEqual([
				'Cat',
				'Dog',
				'Owl',
			])
		)
		stop()
	})
})
