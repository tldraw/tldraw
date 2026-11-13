import { MAX_LIBRARY_ITEMS_PER_REQUEST } from '@tldraw/dotcom-shared'
import {
	LibraryItemRecordType,
	LibraryNotFoundError,
	copyLibrary,
	whenItemsStored,
	type TLLibrary,
	type TLLibraryItem,
	type TLLibraryItemContent,
} from '@tldraw/libraries'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createFakeLibrariesBackend } from './fakeLibrariesBackend'
import { TldrawAppLibrariesSource } from './librariesSource'

// An add, once its items are stored as well as listed.
async function added<T extends TLLibraryItem | TLLibraryItem[]>(adding: Promise<T>) {
	const result = await adding
	await whenItemsStored((Array.isArray(result) ? result : [result]).map((item) => item.id))
	return result
}

const content: TLLibraryItemContent = {
	formatVersion: 1,
	content: { shapes: [], bindings: [], rootShapeIds: [], assets: [], schema: {} as any },
}

const rowId = (id: string) => id.slice(id.indexOf(':') + 1)

const png = (text = 'png') => new Blob([text], { type: 'image/png' })

function setUp() {
	const backend = createFakeLibrariesBackend()
	vi.stubGlobal('fetch', backend.fetch)
	let urls = 0
	vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:local-${++urls}`)
	vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
	const source = new TldrawAppLibrariesSource(backend.app, backend.getToken)
	return { backend, source }
}

afterEach(() => {
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
})

describe('TldrawAppLibrariesSource', () => {
	it("lists the user's workspaces as owners, home first, and creates new libraries there", async () => {
		const { source } = setUp()
		expect(source.getLibraryOwners().map(({ id, name }) => ({ id, name }))).toEqual([
			{ id: 'user_me', name: 'Home' },
			{ id: 'acme', name: 'Acme' },
		])
		expect(source.getDefaultOwnerId()).toBe('user_me')
		const library = await source.createLibrary('Kit')
		expect(library.ownerId).toBe('user_me')
		expect(source.getLibraries()).toMatchObject([{ id: library.id, name: 'Kit' }])
	})

	it('lists libraries from the synced rows, with their workspace as owner', async () => {
		const { source } = setUp()
		const kit = await source.createLibrary('Team kit', { ownerId: 'acme' })
		const moved = await source.moveLibrary(kit.id, 'user_me')
		expect(moved).toMatchObject({ id: kit.id, ownerId: 'user_me' })
		expect(source.getLibraries().map((c) => [c.name, c.ownerId])).toEqual([['Team kit', 'user_me']])
	})

	it("refuses to create in a workspace the user isn't in", async () => {
		const { source } = setUp()
		expect(source.can('createLibrary')).toBe(true)
		expect(source.can('createLibrary', { ownerId: 'acme' })).toBe(true)
		expect(source.can('createLibrary', { ownerId: 'elsewhere' })).toBe(false)
		await expect(source.createLibrary('Kit', { ownerId: 'elsewhere' })).rejects.toThrow()
	})

	it('reports a mutation the server rejects', async () => {
		const { source } = setUp()
		const kit = await source.createLibrary('Kit')
		await expect(source.moveLibrary(kit.id, 'elsewhere')).rejects.toThrow('rejected')
	})

	it("adds an item through the worker, with the user's token, and loads its content back", async () => {
		const { backend, source } = setUp()
		const kit = await source.createLibrary('Kit')
		const item = await added(
			source.addItem(kit.id, {
				name: 'Star',
				content,
				thumbnail: new Blob(['png'], { type: 'image/png' }),
			})
		)
		const [, init] = backend.fetch.mock.calls[0]
		expect(new Headers(init!.headers).get('Authorization')).toBe('Bearer token')
		expect(source.getItems(kit.id)).toMatchObject([
			{ id: item.id, name: 'Star', thumbnail: item.thumbnail },
		])
		expect(item.thumbnail).toBe('blob:local-1')
		expect(backend.rows.get()[0].items[0].thumbnail).toBe('https://content.test/thumbnail-1-png')
		expect(await source.getItemContent(item.id)).toEqual(content)
	})

	it("lists an item's thumbnail from its row, with no request", async () => {
		const { backend, source } = setUp()
		const kit = await source.createLibrary('Kit')
		await added(
			source.addItem(kit.id, { content, thumbnail: new Blob(['png'], { type: 'image/png' }) })
		)
		const requests = backend.fetch.mock.calls.length
		// another client of the same account, which sees the row arrive through Zero
		const second = new TldrawAppLibrariesSource(backend.app, backend.getToken)
		expect(second.getItems(kit.id)[0]?.thumbnail).toBe('https://content.test/thumbnail-1-png')
		expect(backend.fetch.mock.calls.length).toBe(requests)
	})

	it('stores a light and a dark thumbnail, and lists both', async () => {
		const { backend, source } = setUp()
		const kit = await source.createLibrary('Kit')
		const item = await added(
			source.addItem(kit.id, {
				content,
				thumbnail: {
					light: new Blob(['light'], { type: 'image/png' }),
					dark: new Blob(['dark'], { type: 'image/png' }),
				},
			})
		)
		const pair = {
			light: 'https://content.test/thumbnail-1-png',
			dark: 'https://content.test/thumbnail-2-png',
		}
		expect(item.thumbnail).toEqual({ light: 'blob:local-1', dark: 'blob:local-2' })
		const second = new TldrawAppLibrariesSource(backend.app, backend.getToken)
		expect(second.getItems(kit.id)[0]?.thumbnail).toEqual(pair)
	})

	it('copies a library in the worker rather than item by item', async () => {
		const { backend, source } = setUp()
		const kit = await source.createLibrary('Kit')
		await added(source.addItem(kit.id, { name: 'Star', content }))
		const copy = await copyLibrary(source, kit.id, 'acme')
		expect(copy).toMatchObject({ name: 'Kit', ownerId: 'acme' })
		expect(source.getItems(copy.id).map((i) => i.name)).toEqual(['Star'])
		const urls = backend.fetch.mock.calls.map(([url]) => String(url))
		expect(urls.filter((url) => url.endsWith('/content'))).toEqual([])
	})

	it('renames, moves and deletes items through the mutators', async () => {
		const { source } = setUp()
		const kit = await source.createLibrary('Kit')
		const other = await source.createLibrary('Other', { ownerId: 'acme' })
		const item = await added(source.addItem(kit.id, { content }))
		await source.renameItem(item.id, 'Star')
		await source.moveItem(item.id, other.id)
		expect(source.getItems(other.id).map((i) => i.name)).toEqual(['Star'])
		await source.deleteItem(item.id)
		expect(source.getItems(other.id)).toEqual([])
	})

	describe('before the server answers', () => {
		it('lists a new library once Zero has applied it locally', async () => {
			const { backend, source } = setUp()
			backend.holdServer()
			const kit = await source.createLibrary('Kit')
			expect(source.getLibraries()).toMatchObject([{ id: kit.id, name: 'Kit' }])
		})

		it('drops a new library the server rejects, and shows the mutation error', async () => {
			const { backend, source } = setUp()
			const server = backend.holdServer()
			await source.createLibrary('Kit')
			server.fail()
			await vi.waitFor(() => expect(source.getLibraries()).toEqual([]))
			expect(backend.showMutationRejectionToast).toHaveBeenCalledWith({
				type: 'app',
				message: 'forbidden',
			})
		})

		it('adds items to a new library only once the server has it', async () => {
			const { backend, source } = setUp()
			const server = backend.holdServer()
			const kit = await source.createLibrary('Kit')
			const item = await source.addItem(kit.id, { name: 'Star', content })
			await Promise.resolve()
			expect(backend.fetch).not.toHaveBeenCalled()
			expect(source.getItems(kit.id)).toMatchObject([{ name: 'Star' }])
			server.release()
			await whenItemsStored([item.id])
			expect(backend.fetch).toHaveBeenCalledOnce()
		})

		it('rejects adding to a new library the server rejects', async () => {
			const { backend, source } = setUp()
			const server = backend.holdServer()
			const kit = await source.createLibrary('Kit')
			const item = await source.addItem(kit.id, { content })
			server.fail()
			await expect(whenItemsStored([item.id])).rejects.toThrow()
			expect(backend.fetch).not.toHaveBeenCalled()
		})

		it('lists an item being added at once, with its own thumbnail and content', async () => {
			const { backend, source } = setUp()
			const kit = await source.createLibrary('Kit')
			backend.holdRequests()
			source.addItem(kit.id, {
				name: 'Star',
				content,
				thumbnail: { light: png('light'), dark: png('dark') },
			})
			const [pending] = source.getItems(kit.id)
			expect(pending).toMatchObject({
				name: 'Star',
				thumbnail: { light: 'blob:local-1', dark: 'blob:local-2' },
			})
			expect(await source.getItemContent(pending.id)).toEqual(content)
		})

		it('keeps the id an item being added is listed under through to its row', async () => {
			const { backend, source } = setUp()
			const kit = await source.createLibrary('Kit')
			const requests = backend.holdRequests()
			const rows = backend.holdWorkerRows()
			const item = await source.addItem(kit.id, {
				name: 'Star',
				content,
				thumbnail: png(),
			})
			const [pending] = source.getItems(kit.id)
			expect(item).toEqual(pending)
			requests.release()
			await whenItemsStored([item.id])
			expect(item.id).toBe(pending.id)
			const [, init] = backend.fetch.mock.calls[0]
			const [{ id }] = JSON.parse((init!.body as FormData).get('items') as string)
			expect(LibraryItemRecordType.createId(id)).toBe(pending.id)
			// answered, but the row hasn't arrived through Zero yet
			expect(source.getItems(kit.id)).toMatchObject([
				{ id: item.id, name: 'Star', thumbnail: item.thumbnail },
			])
			rows.release()
			await vi.waitFor(() => expect(backend.rows.get()[0].items).toHaveLength(1))
			expect(LibraryItemRecordType.createId(backend.rows.get()[0].items[0].id)).toBe(pending.id)
			expect(source.getItems(kit.id)).toMatchObject([
				{ id: pending.id, name: 'Star', thumbnail: 'blob:local-1' },
			])
			expect(URL.revokeObjectURL).not.toHaveBeenCalled()
		})

		it('drops an item the worker fails to store, and rejects', async () => {
			const { backend, source } = setUp()
			const kit = await source.createLibrary('Kit')
			const requests = backend.holdRequests()
			const item = await source.addItem(kit.id, { content, thumbnail: png() })
			expect(source.getItems(kit.id)).toHaveLength(1)
			const [pending] = source.getItems(kit.id)
			const renaming = source.renameItem(pending.id, 'Moon')
			requests.fail()
			await expect(whenItemsStored([item.id])).rejects.toThrow("Couldn't add the items: 500")
			expect(backend.toasts.addToast).toHaveBeenCalledWith(
				expect.objectContaining({ title: "Couldn't save to library", severity: 'error' })
			)
			expect(source.getItems(kit.id)).toEqual([])
			expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-1')
			await expect(renaming).rejects.toThrow(LibraryNotFoundError)
		})

		it('lists several items being added at once, sends them in one request, and keeps their ids', async () => {
			const { backend, source } = setUp()
			const kit = await source.createLibrary('Kit')
			const requests = backend.holdRequests()
			const rows = backend.holdWorkerRows()
			const items = await source.addItems(kit.id, [
				{ name: 'Star', content, thumbnail: png() },
				{ name: 'Moon', content },
				{ name: 'Sun', content, thumbnail: { light: png(), dark: png() } },
			])
			const pending = source.getItems(kit.id)
			expect(pending.map((item) => [item.name, item.thumbnail])).toEqual([
				['Star', 'blob:local-1'],
				['Moon', undefined],
				['Sun', { light: 'blob:local-2', dark: 'blob:local-3' }],
			])
			expect(items).toEqual(pending)
			requests.release()
			await whenItemsStored(items.map((item) => item.id))
			expect(backend.fetch).toHaveBeenCalledTimes(1)
			const [, init] = backend.fetch.mock.calls[0]
			const form = init!.body as FormData
			const listed: { id: string; name?: string }[] = JSON.parse(form.get('items') as string)
			expect(listed.map(({ id }) => LibraryItemRecordType.createId(id))).toEqual(
				pending.map((item) => item.id)
			)
			expect(listed.map(({ name }) => name)).toEqual(['Star', 'Moon', 'Sun'])
			expect(form.get(`darkThumbnail:${listed[2].id}`)).toBeInstanceOf(Blob)
			expect(items.map((item) => item.id)).toEqual(pending.map((item) => item.id))
			// answered, but the rows haven't arrived through Zero yet
			expect(source.getItems(kit.id).map((item) => [item.id, item.name, item.thumbnail])).toEqual(
				items.map((item) => [item.id, item.name, item.thumbnail])
			)

			rows.release()
			await vi.waitFor(() => expect(backend.rows.get()[0].items).toHaveLength(3))
			expect(source.getItems(kit.id).map((item) => [item.id, item.name, item.thumbnail])).toEqual([
				[pending[0].id, 'Star', 'blob:local-1'],
				[pending[1].id, 'Moon', undefined],
				[pending[2].id, 'Sun', { light: 'blob:local-2', dark: 'blob:local-3' }],
			])
			expect(URL.revokeObjectURL).not.toHaveBeenCalled()
		})

		it('drops every item being added together when the worker fails to store them', async () => {
			const { backend, source } = setUp()
			const kit = await source.createLibrary('Kit')
			const requests = backend.holdRequests()
			const items = await source.addItems(kit.id, [
				{ content, thumbnail: png() },
				{ content, thumbnail: png() },
			])
			const pending = source.getItems(kit.id)
			expect(pending).toHaveLength(2)
			const loading = source.getItemContent(pending[1].id)
			const renaming = source.renameItem(pending[0].id, 'Moon')
			requests.fail()
			await expect(whenItemsStored(items.map((item) => item.id))).rejects.toThrow(
				"Couldn't add the items: 500"
			)
			expect(source.getItems(kit.id)).toEqual([])
			expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-1')
			expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-2')
			expect(await loading).toEqual(content)
			await expect(renaming).rejects.toThrow(LibraryNotFoundError)
		})

		it('sends more items than one request may add in several, one after another', async () => {
			const { backend, source } = setUp()
			const kit = await source.createLibrary('Kit')
			const requests = backend.holdRequests()
			const newItems = Array.from({ length: MAX_LIBRARY_ITEMS_PER_REQUEST + 1 }, (_, i) => ({
				name: `Item ${i}`,
				content,
			}))
			const items = await source.addItems(kit.id, newItems)
			expect(source.getItems(kit.id)).toHaveLength(newItems.length)
			requests.release()
			await whenItemsStored(items.map((item) => item.id))
			expect(items.map((item) => item.name)).toEqual(newItems.map((item) => item.name))
			const sizes = backend.fetch.mock.calls.map(
				([, init]) => JSON.parse((init!.body as FormData).get('items') as string).length
			)
			expect(sizes).toEqual([MAX_LIBRARY_ITEMS_PER_REQUEST, 1])
		})

		it('renames an item being added once its row has arrived', async () => {
			const { backend, source } = setUp()
			const kit = await source.createLibrary('Kit')
			const requests = backend.holdRequests()
			source.addItem(kit.id, { name: 'Star', content })
			const [pending] = source.getItems(kit.id)
			const renaming = source.renameItem(pending.id, 'Moon')
			requests.release()
			await renaming
			expect(source.getItems(kit.id)).toMatchObject([{ name: 'Moon' }])
		})
	})

	describe('copying a library', () => {
		async function withKit() {
			const setup = setUp()
			const kit = await setup.source.createLibrary('Kit')
			const star = await added(
				setup.source.addItem(kit.id, { name: 'Star', content, thumbnail: png() })
			)
			const moon = await added(setup.source.addItem(kit.id, { name: 'Moon', content }))
			return { ...setup, kit, star, moon }
		}

		it('lists the copy and its items at once, with the source items’ names and thumbnails', async () => {
			const { backend, source, kit, star } = await withKit()
			backend.holdRequests()
			source.copyLibrary(kit.id, 'acme')
			const copy = source.getLibraries().find((c) => c.id !== kit.id)!
			expect(copy).toMatchObject({ name: 'Kit', ownerId: 'acme' })
			expect(source.getItems(copy.id)).toMatchObject([
				{ name: 'Star', thumbnail: star.thumbnail, libraryId: copy.id },
				{ name: 'Moon', libraryId: copy.id },
			])
			expect(source.can('renameLibrary', copy.id)).toBe(true)
		})

		it('places an item being copied from its source item’s content', async () => {
			const { backend, source, kit } = await withKit()
			const requests = backend.holdRequests()
			source.copyLibrary(kit.id, 'acme')
			const copy = source.getLibraries().find((c) => c.id !== kit.id)!
			const [pending] = source.getItems(copy.id)
			const loading = source.getItemContent(pending.id)
			requests.release()
			expect(await loading).toEqual(content)
		})

		it('sends the ids it listed the copy under, and keeps them once the rows arrive', async () => {
			const { backend, source, kit, star, moon } = await withKit()
			const rows = backend.holdWorkerRows()
			const copying = source.copyLibrary(kit.id, 'acme')
			const listed = source.getLibraries().find((c) => c.id !== kit.id)!
			const listedItems = source.getItems(listed.id)
			const copy = await copying
			expect(copy.id).toBe(listed.id)
			const [, init] = backend.fetch.mock.calls.at(-1)!
			const body = JSON.parse(init!.body as string)
			expect(body.id).toBe(rowId(listed.id))
			expect(body.itemIds).toEqual({
				[rowId(star.id)]: rowId(listedItems[0].id),
				[rowId(moon.id)]: rowId(listedItems[1].id),
			})
			// answered, but the rows haven't arrived through Zero yet
			expect(source.getItems(copy.id)).toEqual(listedItems)
			rows.release()
			await vi.waitFor(() => expect(backend.rows.get()).toHaveLength(2))
			expect(source.getLibraries().map((c) => c.id)).toEqual([kit.id, listed.id])
			expect(source.getItems(copy.id).map((i) => [i.id, i.name])).toEqual(
				listedItems.map((i) => [i.id, i.name])
			)
			expect(source.getItems(copy.id)[0].thumbnail).toMatch(/^https:\/\/content\.test\//)
		})

		it('drops the copy when the worker fails, and rejects', async () => {
			const { backend, source, kit } = await withKit()
			const requests = backend.holdRequests()
			const copying = source.copyLibrary(kit.id, 'acme')
			const copy = source.getLibraries().find((c) => c.id !== kit.id)!
			const renaming = source.renameLibrary(copy.id, 'Copied kit')
			requests.fail()
			await expect(copying).rejects.toThrow("Couldn't copy the library: 500")
			expect(source.getLibraries().map((c) => c.id)).toEqual([kit.id])
			expect(source.getItems(copy.id)).toEqual([])
			await expect(renaming).rejects.toThrow(LibraryNotFoundError)
		})

		it('renames a copy once its row has arrived', async () => {
			const { backend, source, kit } = await withKit()
			const rows = backend.holdWorkerRows()
			source.copyLibrary(kit.id, 'acme')
			const copy = source.getLibraries().find((c) => c.id !== kit.id)!
			const renaming = source.renameLibrary(copy.id, 'Copied kit')
			rows.release()
			await renaming
			expect(source.getLibraries().find((c) => c.id === copy.id)?.name).toBe('Copied kit')
		})

		it('copies a new library only once the server has it', async () => {
			const { backend, source } = setUp()
			const server = backend.holdServer()
			const kit = await source.createLibrary('Kit')
			const copying = source.copyLibrary(kit.id, 'acme')
			await Promise.resolve()
			expect(source.getLibraries()).toHaveLength(2)
			expect(backend.fetch).not.toHaveBeenCalled()
			server.release()
			await copying
			expect(backend.fetch).toHaveBeenCalledOnce()
		})
	})

	describe('changes before the server confirms them', () => {
		const mutations = {
			renameLibrary: async (source: TldrawAppLibrariesSource, kit: TLLibrary) =>
				source.renameLibrary(kit.id, 'Renamed'),
			moveLibrary: async (source: TldrawAppLibrariesSource, kit: TLLibrary) =>
				source.moveLibrary(kit.id, 'acme'),
			deleteLibrary: async (source: TldrawAppLibrariesSource, kit: TLLibrary) =>
				source.deleteLibrary(kit.id),
			renameItem: async (source: TldrawAppLibrariesSource, kit: TLLibrary) =>
				source.renameItem(source.getItems(kit.id)[0].id, 'Renamed'),
			moveItem: async (source: TldrawAppLibrariesSource, kit: TLLibrary, other: TLLibrary) =>
				source.moveItem(source.getItems(kit.id)[0].id, other.id),
			deleteItem: async (source: TldrawAppLibrariesSource, kit: TLLibrary) =>
				source.deleteItem(source.getItems(kit.id)[0].id),
		}

		it.each(Object.entries(mutations))(
			'%s resolves once applied locally, and is rolled back with a toast if the server rejects it',
			async (_, mutate) => {
				const { backend, source } = setUp()
				const kit = await source.createLibrary('Kit')
				const other = await source.createLibrary('Other')
				await added(source.addItem(kit.id, { name: 'Star', content }))
				const before = backend.rows.get()
				const server = backend.holdServer()

				await mutate(source, kit, other)
				expect(backend.rows.get()).not.toEqual(before)
				expect(backend.showMutationRejectionToast).not.toHaveBeenCalled()

				server.fail()
				await vi.waitFor(() => expect(backend.rows.get()).toEqual(before))
				expect(backend.showMutationRejectionToast).toHaveBeenCalledWith({
					type: 'app',
					message: 'forbidden',
				})
			}
		)
	})

	it('releases the thumbnails it made when deleting an item, and when disposed', async () => {
		const { source } = setUp()
		const kit = await source.createLibrary('Kit')
		const first = await added(source.addItem(kit.id, { content, thumbnail: png() }))
		await added(source.addItem(kit.id, { content, thumbnail: png() }))
		await source.deleteItem(first.id)
		expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-1')
		source.dispose()
		expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-2')
	})
})
