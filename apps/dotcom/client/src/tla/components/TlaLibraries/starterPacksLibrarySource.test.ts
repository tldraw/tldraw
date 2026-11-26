import {
	InMemoryLibrarySource,
	LibraryPermissionError,
	type LibrarySource,
	type TLLibraryAction,
} from '@tldraw/libraries'
import { describe, expect, it, vi } from 'vitest'
import { ReadOnlyLibraryView } from './readOnlyLibrarySource'
import {
	loadStarterPack,
	loadStarterPackIndex,
	loadStarterPackItemContent,
	loadStarterPackSummaries,
	type StarterPackIndex,
} from './starterPacks'
import { getStarterPackLibraryId, StarterPacksLibrarySource } from './starterPacksLibrarySource'

const actions: TLLibraryAction[] = [
	'createLibrary',
	'renameLibrary',
	'deleteLibrary',
	'addItem',
	'updateItem',
	'deleteItem',
	'addLibraryToDocument',
	'removeLibraryFromDocument',
]

async function loaded(source: StarterPacksLibrarySource) {
	await source.load()
	await Promise.all(source.getLibraries().map((library) => source.loadItems(library.id)))
	return source
}

async function expectReadOnly(source: LibrarySource) {
	const library = source.getLibraries()[0]
	const item = source.getItems(library.id)[0]
	for (const action of actions) {
		expect(source.can(action)).toBe(false)
		expect(source.can(action, library.id)).toBe(false)
	}
	await expect(source.createLibrary('New')).rejects.toBeInstanceOf(LibraryPermissionError)
	await expect(source.renameLibrary(library.id, 'Renamed')).rejects.toBeInstanceOf(
		LibraryPermissionError
	)
	await expect(source.deleteLibrary(library.id)).rejects.toBeInstanceOf(LibraryPermissionError)
	await expect(
		source.addItem(library.id, { content: await source.getItemContent(item.id) })
	).rejects.toBeInstanceOf(LibraryPermissionError)
	await expect(source.updateItem(item.id, { name: 'Renamed' })).rejects.toBeInstanceOf(
		LibraryPermissionError
	)
	await expect(source.deleteItem(item.id)).rejects.toBeInstanceOf(LibraryPermissionError)
}

describe('StarterPacksLibrarySource', () => {
	it('lists the packs once their summaries load, in order, without their items', async () => {
		const loadIndex = vi.fn(loadStarterPackIndex)
		const source = new StarterPacksLibrarySource(['math', 'diagramming'], loadIndex)
		await loadStarterPackSummaries()
		expect(source.getLibraries().map((library) => library.id)).toEqual([
			getStarterPackLibraryId('math'),
			getStarterPackLibraryId('diagramming'),
		])
		expect(source.getLibraries().map((library) => library.name)).toEqual(['Math', 'Diagramming'])
		expect(source.getItems(getStarterPackLibraryId('math'))).toEqual([])
		expect(source.isLoadingItems(getStarterPackLibraryId('math'))).toBe(true)
		expect(loadIndex).not.toHaveBeenCalled()
	})

	it("lists a pack's items from its index, and loads an item's content only when asked", async () => {
		const loadContent = vi.fn(loadStarterPackItemContent)
		const source = new StarterPacksLibrarySource(['diagramming'], loadStarterPackIndex, loadContent)
		const libraryId = getStarterPackLibraryId('diagramming')
		await source.load()
		await source.loadItems(libraryId)

		const diagramming = await loadStarterPack('diagramming')
		const items = source.getItems(libraryId)
		expect(source.isLoadingItems(libraryId)).toBe(false)
		expect(items.map((item) => item.name)).toEqual(diagramming.items.map((item) => item.name))
		expect(items[0].thumbnail).toEqual(diagramming.items[0].thumbnail)
		expect(loadContent).not.toHaveBeenCalled()

		expect(await source.getItemContent(items[0].id)).toEqual(diagramming.items[0].content)
		expect(loadContent).toHaveBeenCalledTimes(1)
		expect(loadContent).toHaveBeenCalledWith('diagramming', diagramming.items[0].id)
	})

	it('fetches each index once', async () => {
		const loadIndex = vi.fn(loadStarterPackIndex)
		const source = new StarterPacksLibrarySource(['diagramming'], loadIndex)
		const libraryId = getStarterPackLibraryId('diagramming')
		await Promise.all([source.loadItems(libraryId), source.loadItems(libraryId)])
		await source.loadItems(libraryId)
		expect(loadIndex).toHaveBeenCalledTimes(1)
	})

	it('refuses every change', async () => {
		await expectReadOnly(await loaded(new StarterPacksLibrarySource(['diagramming'])))
	})

	it('fetches a pack that failed again the next time', async () => {
		const diagramming = await loadStarterPackIndex('diagramming')
		const loadIndex = vi
			.fn<(id: string) => Promise<StarterPackIndex>>()
			.mockRejectedValueOnce(new Error('offline'))
			.mockResolvedValue(diagramming)
		vi.spyOn(console, 'error').mockImplementation(() => {})
		const source = new StarterPacksLibrarySource(['diagramming'], loadIndex)
		const libraryId = getStarterPackLibraryId('diagramming')

		await source.loadItems(libraryId)
		expect(source.getItems(libraryId)).toEqual([])

		await source.loadItems(libraryId)
		expect(source.getItems(libraryId)).toHaveLength(diagramming.items.length)
	})
})

describe('ReadOnlyLibraryView', () => {
	it("lists another source's libraries and refuses every change to them", async () => {
		const writable = new InMemoryLibrarySource()
		const library = await writable.createLibrary('Shapes')
		const pack = await loadStarterPack('diagramming')
		await writable.addItem(library.id, { name: 'Box', content: pack.items[0].content })
		const view = new ReadOnlyLibraryView(writable)

		expect(view.getLibraries()).toEqual(writable.getLibraries())
		expect(view.getItems(library.id)).toEqual(writable.getItems(library.id))
		await expectReadOnly(view)
	})
})
