import { captureException } from '@sentry/react'
import {
	LibraryNotFoundError,
	whenItemsStored,
	type TLLibraryItem,
	type TLNewLibraryItem,
} from '@tldraw/libraries'
import {
	createShapeId,
	createTLSchema,
	createTLStore,
	defaultBindingUtils,
	defaultShapeUtils,
	Editor,
	type TLLibraryItemId,
} from 'tldraw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fileSchemaRecords } from '../../../utils/fileSchemaRecords'
import { getEditorLibraries } from './editorLibraries'
import { createFakeLibrariesBackend } from './fakeLibrariesBackend'
import { TldrawAppLibrariesSource } from './librariesSource'
import { addStarterPack } from './starterPacks'
import { getUntrackedSource, TrackedLibrarySource } from './trackedLibrarySource'

vi.mock('@sentry/react', () => ({ captureException: vi.fn() }))

let editors: Editor[] = []

afterEach(() => {
	for (const editor of editors) editor.dispose()
	editors = []
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
	vi.mocked(captureException).mockClear()
})

function setUp() {
	const backend = createFakeLibrariesBackend({ userId: 'home' })
	vi.stubGlobal('fetch', backend.fetch)
	vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:local')
	vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
	const libraries = new TldrawAppLibrariesSource(backend.app, backend.getToken)
	const editor = new Editor({
		store: createTLStore({ schema: createTLSchema({ records: fileSchemaRecords }) }),
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: [],
		getContainer: () => document.body,
	})
	editors.push(editor)
	const source = getEditorLibraries(backend.app, libraries, editor, 'file-a')
	const newItem = (name = 'Secret item'): TLNewLibraryItem => {
		const id = createShapeId()
		editor.createShape({ id, type: 'geo' })
		return { name, content: { formatVersion: 1, content: editor.getContentFromCurrentPage([id])! } }
	}
	const events = () => backend.trackEvent.mock.calls.map(([name, data]) => [name, data])
	return { backend, source, newItem, events }
}

async function stored(items: TLLibraryItem[]) {
	await whenItemsStored(items.map((item) => item.id))
	await Promise.resolve()
}

describe('TrackedLibrarySource', () => {
	it('reports creating a library with the kind of owner it went to', async () => {
		const { source, events } = setUp()
		await source.createLibrary('Secret', { ownerId: 'file-a' })
		await source.createLibrary('Secret')
		await source.createLibrary('Secret', { ownerId: 'acme' })
		expect(events()).toEqual([
			['create-library', { source: 'libraries', owner: 'file', method: 'new' }],
			['create-library', { source: 'libraries', owner: 'home', method: 'new' }],
			['create-library', { source: 'libraries', owner: 'workspace', method: 'new' }],
		])
	})

	it('reports adding items once they are stored, with how many', async () => {
		const { source, newItem, events } = setUp()
		const library = await source.createLibrary('Secret')
		const items = await source.addItems!(library.id, [newItem(), newItem()])
		expect(events()).toHaveLength(1)
		await stored(items)
		expect(events().at(-1)).toEqual(['add-to-library', { source: 'libraries', item_count: 2 }])
	})

	it('reports adding items that fail to store as an error, not an add', async () => {
		const { backend, source, newItem, events } = setUp()
		const library = await source.createLibrary('Secret')
		backend.fetch.mockResolvedValueOnce(new Response(null, { status: 500 }))
		const item = await source.addItem(library.id, newItem())
		await expect(stored([item])).rejects.toThrow()
		await vi.waitFor(() =>
			expect(events().at(-1)).toEqual([
				'library-error',
				{ source: 'libraries', action: 'add-to-library', reason: 'failed' },
			])
		)
		expect(events().map(([name]) => name)).not.toContain('add-to-library')
		expect(captureException).toHaveBeenCalledWith(expect.any(Error), {
			tags: { operation: 'add-to-library' },
		})
	})

	it('reports changes to libraries and items', async () => {
		const { source, newItem, events } = setUp()
		const library = await source.createLibrary('Secret')
		const other = await source.createLibrary('Secret')
		const [item] = await source.addItems!(library.id, [newItem()])
		await stored([item])
		await source.renameLibrary(library.id, 'Renamed secret')
		await source.updateItem(item.id, { name: 'Renamed secret item' })
		await source.updateItem(item.id, { meta: { category: 'x' } })
		await source.moveItem!(item.id, other.id)
		await source.copyLibrary!(other.id, 'acme')
		await source.moveLibrary!(library.id, 'acme')
		await source.deleteItem(item.id)
		await source.deleteLibrary(library.id)
		expect(events().slice(3)).toEqual([
			['rename-library', { source: 'libraries' }],
			['rename-library-item', { source: 'libraries' }],
			['move-library-item', { source: 'libraries' }],
			[
				'create-library',
				{ source: 'libraries', owner: 'workspace', method: 'copy', item_count: 1 },
			],
			['move-library', { source: 'libraries' }],
			['delete-library-item', { source: 'libraries' }],
			['delete-library', { source: 'libraries' }],
		])
	})

	it('reports adding a library to the file and removing it', async () => {
		const { source, events } = setUp()
		const library = await source.createLibrary('Secret', { ownerId: 'acme' })
		await source.removeLibraryFromDocument!(library.id)
		await vi.waitFor(() =>
			expect(source.getAvailableLibraries!().map((l) => l.id)).toContain(library.id)
		)
		await source.addLibraryToDocument!(library.id)
		expect(events().slice(1)).toEqual([
			['remove-library-from-file', { source: 'libraries' }],
			['add-library-to-file', { source: 'libraries' }],
		])
	})

	it('reports changes with the part of the app they were made from', async () => {
		const { backend, events } = setUp()
		const libraries = new TldrawAppLibrariesSource(backend.app, backend.getToken)
		const source = new TrackedLibrarySource(libraries, backend.app, {
			eventSource: 'workspace-settings',
		})
		const library = await source.createLibrary('Secret', { ownerId: 'acme' })
		await source.moveLibrary!(library.id, 'home')
		await source.deleteLibrary(library.id)
		expect(events()).toEqual([
			['create-library', { source: 'workspace-settings', owner: 'workspace', method: 'new' }],
			['move-library', { source: 'workspace-settings' }],
			['delete-library', { source: 'workspace-settings' }],
		])
	})

	it('reports moving a board library to a workspace as one move', async () => {
		const { source, newItem, events } = setUp()
		const library = await source.createLibrary('Secret', { ownerId: 'file-a' })
		await stored(await source.addItems!(library.id, [newItem()]))
		await source.moveLibrary!(library.id, 'home')
		expect(events().slice(2)).toEqual([['move-library', { source: 'libraries' }]])
	})

	it('reports a failed change as an error, and not the change', async () => {
		const { source, events } = setUp()
		const missing = 'library_item:missing' as TLLibraryItemId
		vi.spyOn(getUntrackedSource(source), 'deleteItem').mockRejectedValue(
			new LibraryNotFoundError(missing)
		)
		await expect(source.deleteItem(missing)).rejects.toThrow()
		await expect(source.createLibrary('Secret', { ownerId: 'elsewhere' })).rejects.toThrow()
		expect(events()).toEqual([
			[
				'library-error',
				{ source: 'libraries', action: 'delete-library-item', reason: 'not-found' },
			],
			[
				'library-error',
				{ source: 'libraries', action: 'create-library', method: 'new', reason: 'not-found' },
			],
		])
		expect(captureException).not.toHaveBeenCalled()
	})

	it('reports a failed copy as failing to create a library by copying', async () => {
		const { backend, source, events } = setUp()
		const library = await source.createLibrary('Secret')
		backend.fetch.mockResolvedValueOnce(new Response(null, { status: 500 }))
		await expect(source.copyLibrary!(library.id, 'acme')).rejects.toThrow()
		expect(events().slice(1)).toEqual([
			[
				'library-error',
				{ source: 'libraries', action: 'create-library', method: 'copy', reason: 'failed' },
			],
		])
		expect(captureException).toHaveBeenCalledWith(expect.any(Error), {
			tags: { operation: 'create-library' },
		})
	})

	it('sends a failure to load an item to Sentry only when its reason is unknown', async () => {
		const { source } = setUp()
		const itemId = 'library_item:any' as TLLibraryItemId
		const getItemContent = vi.spyOn(getUntrackedSource(source), 'getItemContent')
		getItemContent.mockRejectedValueOnce(new LibraryNotFoundError(itemId))
		await expect(source.getItemContent(itemId)).rejects.toThrow()
		expect(captureException).not.toHaveBeenCalled()
		const failure = new Error('network down')
		getItemContent.mockRejectedValueOnce(failure)
		await expect(source.getItemContent(itemId)).rejects.toThrow(failure)
		expect(captureException).toHaveBeenCalledWith(failure, {
			tags: { operation: 'get-library-item-content' },
		})
	})

	it('reports a change the server rejects after it was made', async () => {
		const { backend, source, events } = setUp()
		const library = await source.createLibrary('Secret')
		const hold = backend.holdServer()
		await source.renameLibrary(library.id, 'Renamed secret')
		hold.fail()
		await vi.waitFor(() =>
			expect(events().at(-1)).toEqual([
				'library-error',
				{ source: 'libraries', action: 'rename-library', reason: 'rejected' },
			])
		)
		expect(events().map(([name]) => name)).toEqual([
			'create-library',
			'rename-library',
			'library-error',
		])
	})

	it('leaves adding a starter pack to be reported as that', async () => {
		const { source, events } = setUp()
		await addStarterPack(source, { id: 'doodles', name: 'Doodles', version: 1, items: [] })
		expect(events()).toEqual([])
	})

	it('sends no names', async () => {
		const { source, newItem, events } = setUp()
		const library = await source.createLibrary('Secret')
		await stored(await source.addItems!(library.id, [newItem()]))
		await source.renameLibrary(library.id, 'Renamed secret')
		expect(events().length).toBeGreaterThan(0)
		expect(JSON.stringify(events())).not.toMatch(/secret/i)
	})
})
