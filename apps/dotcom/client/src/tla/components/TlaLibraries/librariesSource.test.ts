import { MAX_LIBRARY_NAME_LENGTH, ZErrorCode } from '@tldraw/dotcom-shared'
import {
	LibraryItemRecordType,
	LibraryNotFoundError,
	LibraryPermissionError,
	LibraryRecordType,
	copyLibrary,
	type TLLibrary,
	type TLLibraryItemContent,
	type TLLibraryThumbnailContext,
} from '@tldraw/libraries'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createFakeLibrariesBackend } from './fakeLibrariesBackend'
import { getCopyName, TldrawAppLibrariesSource } from './librariesSource'

const content: TLLibraryItemContent = {
	formatVersion: 1,
	content: { shapes: [], bindings: [], rootShapeIds: [], assets: [], schema: {} as any },
}

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
		expect(source.getLibraryOwners()).toEqual([
			{ id: 'user_me', name: 'Home' },
			{ id: 'acme', name: 'Acme' },
		])
		expect(source.getDefaultOwnerId()).toBe('user_me')
		const library = await source.createLibrary('Kit')
		expect(library.ownerId).toBe('user_me')
		expect(source.getLibraries()).toMatchObject([{ id: library.id, name: 'Kit' }])
	})

	it('returns a new library named as it is stored: trimmed and clamped', async () => {
		const { source } = setUp()
		const name = `  ${'a'.repeat(MAX_LIBRARY_NAME_LENGTH + 10)}  `
		const library = await source.createLibrary(name)
		expect(library.name).toBe('a'.repeat(MAX_LIBRARY_NAME_LENGTH))
		expect(source.getLibraries()).toMatchObject([{ id: library.id, name: library.name }])
	})

	it('lists libraries from the synced rows, with their workspace as owner', async () => {
		const { source } = setUp()
		await source.createLibrary('Team kit', { ownerId: 'acme' })
		await source.createLibrary('Kit', { ownerId: 'user_me' })
		expect(source.getLibraries().map((c) => [c.name, c.ownerId])).toEqual([
			['Team kit', 'acme'],
			['Kit', 'user_me'],
		])
	})

	it("refuses to create in a workspace the user isn't in", async () => {
		const { source } = setUp()
		expect(source.can('createLibrary')).toBe(true)
		expect(source.can('createLibrary', { ownerId: 'acme' })).toBe(true)
		expect(source.can('createLibrary', { ownerId: 'elsewhere' })).toBe(false)
		await expect(source.createLibrary('Kit', { ownerId: 'elsewhere' })).rejects.toThrow()
	})

	describe('at a limit', () => {
		const atLimit = (code: ZErrorCode) => {
			const result = Promise.resolve({ type: 'error', error: { type: 'app', message: code } })
			return { client: result, server: result } as any
		}
		const watchToasts = (app: object) =>
			((app as { showMutationRejectionToast: unknown }).showMutationRejectionToast = vi.fn())

		it('explains a library the workspace has no room for, as not allowed', async () => {
			const { backend, source } = setUp()
			const toast = watchToasts(backend.app)
			vi.spyOn(backend.app.z.mutate.library, 'create').mockReturnValue(
				atLimit(ZErrorCode.max_libraries_reached)
			)
			await expect(source.createLibrary('Kit')).rejects.toBeInstanceOf(LibraryPermissionError)
			expect(toast).toHaveBeenCalledWith(
				expect.objectContaining({ message: ZErrorCode.max_libraries_reached })
			)
		})

		it('explains an item the worker refuses for a full library, as not allowed', async () => {
			const { backend, source } = setUp()
			const toast = watchToasts(backend.app)
			const kit = await source.createLibrary('Kit')
			backend.fetch.mockResolvedValueOnce(
				Response.json({ error: ZErrorCode.max_library_items_reached }, { status: 409 })
			)
			await expect(source.addItem(kit.id, { content })).rejects.toBeInstanceOf(
				LibraryPermissionError
			)
			expect(toast).toHaveBeenCalledWith(
				expect.objectContaining({ message: ZErrorCode.max_library_items_reached })
			)
			expect(source.getItems(kit.id)).toEqual([])
		})

		it('leaves other rejections as failures, without a toast', async () => {
			const { backend, source } = setUp()
			const toast = watchToasts(backend.app)
			const kit = await source.createLibrary('Kit')
			vi.spyOn(backend.app.z.mutate.library, 'rename').mockReturnValue(
				atLimit('forbidden' as ZErrorCode)
			)
			await expect(source.renameLibrary(kit.id, 'Renamed')).rejects.not.toBeInstanceOf(
				LibraryPermissionError
			)
			expect(toast).not.toHaveBeenCalled()
		})
	})

	it("adds an item through the worker, with the user's token, and loads its content back", async () => {
		const { backend, source } = setUp()
		const kit = await source.createLibrary('Kit')
		const item = await source.addItem(kit.id, {
			name: 'Star',
			content,
			thumbnail: new Blob(['png'], { type: 'image/png' }),
		})
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
		await source.addItem(kit.id, { content, thumbnail: new Blob(['png'], { type: 'image/png' }) })
		const requests = backend.fetch.mock.calls.length
		// another client of the same account, which sees the row arrive through Zero
		const second = new TldrawAppLibrariesSource(backend.app, backend.getToken)
		expect(second.getItems(kit.id)[0]?.thumbnail).toBe('https://content.test/thumbnail-1-png')
		expect(backend.fetch.mock.calls.length).toBe(requests)
	})

	it('stores a light and a dark thumbnail, and lists both', async () => {
		const { backend, source } = setUp()
		const kit = await source.createLibrary('Kit')
		const item = await source.addItem(kit.id, {
			content,
			thumbnail: {
				light: new Blob(['light'], { type: 'image/png' }),
				dark: new Blob(['dark'], { type: 'image/png' }),
			},
		})
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
		await source.addItem(kit.id, { name: 'Star', content })
		const copy = await copyLibrary(source, kit.id, 'acme')
		expect(copy).toMatchObject({ name: 'Kit', ownerId: 'acme' })
		expect(source.getItems(copy.id).map((i) => i.name)).toEqual(['Star'])
		const urls = backend.fetch.mock.calls.map(([url]) => String(url))
		expect(urls.filter((url) => url.endsWith('/content'))).toEqual([])
	})

	it('names the copy with getName, and sends the name to the worker', async () => {
		const { backend, source } = setUp()
		const kit = await source.createLibrary('Kit')
		await source.addItem(kit.id, { name: 'Star', content })
		const copy = await source.copyLibrary(kit.id, 'acme', { getName: (name) => `${name} (Copy)` })
		expect(copy.name).toBe('Kit (Copy)')
		const [, init] = backend.fetch.mock.calls.at(-1)!
		expect(JSON.parse(init!.body as string)).toMatchObject({ name: 'Kit (Copy)' })
		expect(source.getLibraries().find((c) => c.id === copy.id)?.name).toBe('Kit (Copy)')
		expect(source.getItems(copy.id).map((i) => i.name)).toEqual(['Star'])
	})

	it('shortens a long name so that the copy keeps the whole of what getName adds', () => {
		const getName = (name: string) => `${name} (Copy)`
		const name = getCopyName('x'.repeat(MAX_LIBRARY_NAME_LENGTH), { getName })
		expect(name).toHaveLength(MAX_LIBRARY_NAME_LENGTH)
		expect(name.endsWith(' (Copy)')).toBe(true)
		expect(getCopyName('Kit', {})).toBe('Kit')
	})

	it('renames, moves and deletes items through the mutators', async () => {
		const { source } = setUp()
		const kit = await source.createLibrary('Kit')
		const other = await source.createLibrary('Other', { ownerId: 'acme' })
		const item = await source.addItem(kit.id, { content })
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
			const adding = source.addItem(kit.id, { name: 'Star', content })
			await Promise.resolve()
			expect(backend.fetch).not.toHaveBeenCalled()
			expect(source.getItems(kit.id)).toMatchObject([{ name: 'Star' }])
			server.release()
			await adding
			expect(backend.fetch).toHaveBeenCalledOnce()
		})

		it('rejects adding to a new library the server rejects', async () => {
			const { backend, source } = setUp()
			const server = backend.holdServer()
			const kit = await source.createLibrary('Kit')
			const adding = source.addItem(kit.id, { content })
			server.fail()
			await expect(adding).rejects.toThrow()
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
			const rows = backend.holdItemRows()
			const adding = source.addItem(kit.id, { name: 'Star', content, thumbnail: png() })
			const [pending] = source.getItems(kit.id)
			requests.release()
			const item = await adding
			expect(item.id).toBe(pending.id)
			const [, init] = backend.fetch.mock.calls[0]
			expect(LibraryItemRecordType.createId((init!.body as FormData).get('id') as string)).toBe(
				pending.id
			)
			// answered, but the row hasn't arrived through Zero yet
			expect(source.getItems(kit.id)).toEqual([item])
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
			const adding = source.addItem(kit.id, { content, thumbnail: png() })
			expect(source.getItems(kit.id)).toHaveLength(1)
			const [pending] = source.getItems(kit.id)
			const renaming = source.renameItem(pending.id, 'Moon')
			requests.fail()
			await expect(adding).rejects.toThrow("Couldn't add the item: 500")
			expect(source.getItems(kit.id)).toEqual([])
			expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-1')
			await expect(renaming).rejects.toThrow(LibraryNotFoundError)
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

	describe('changes before the server confirms them', () => {
		const mutations = {
			renameLibrary: async (source: TldrawAppLibrariesSource, kit: TLLibrary) =>
				source.renameLibrary(kit.id, 'Renamed'),
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
				await source.addItem(kit.id, { name: 'Star', content })
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
		const first = await source.addItem(kit.id, { content, thumbnail: png() })
		await source.addItem(kit.id, { content, thumbnail: png() })
		await source.deleteItem(first.id)
		expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-1')
		source.dispose()
		expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-2')
	})

	describe('resolveThumbnail', () => {
		const uploads = 'https://tldrawusercontent.com'
		const context = (
			overrides: Partial<TLLibraryThumbnailContext> = {}
		): TLLibraryThumbnailContext => ({
			colorMode: 'light',
			width: 128,
			dpr: 2,
			networkEffectiveType: '4g',
			...overrides,
		})
		const itemWith = (thumbnail?: string | { light: string; dark: string }) =>
			LibraryItemRecordType.create({
				libraryId: LibraryRecordType.createId('kit'),
				...(thumbnail ? { thumbnail } : {}),
			})

		it('resizes a stored thumbnail to the tile at the screen density', () => {
			const { source } = setUp()
			const item = itemWith(`${uploads}/abc-png`)
			expect(source.resolveThumbnail(item, context())).toBe(
				`${uploads}/cdn-cgi/image/w=256,format=auto/abc-png`
			)
			expect(source.resolveThumbnail(item, context({ networkEffectiveType: '3g' }))).toBe(
				`${uploads}/cdn-cgi/image/w=128,format=auto/abc-png`
			)
		})

		it("picks the colour mode's thumbnail", () => {
			const { source } = setUp()
			const item = itemWith({ light: `${uploads}/light-png`, dark: `${uploads}/dark-png` })
			expect(source.resolveThumbnail(item, context({ colorMode: 'dark' }))).toBe(
				`${uploads}/cdn-cgi/image/w=256,format=auto/dark-png`
			)
			expect(source.resolveThumbnail(item, context({ colorMode: 'light' }))).toBe(
				`${uploads}/cdn-cgi/image/w=256,format=auto/light-png`
			)
		})

		it('passes object URLs, data URIs and SVG thumbnails through unchanged', () => {
			const { source } = setUp()
			for (const src of [
				'blob:http://localhost:3000/1234',
				'data:image/png;base64,AAAA',
				`${uploads}/abc-svg`,
			]) {
				expect(source.resolveThumbnail(itemWith(src), context())).toBe(src)
			}
		})

		it('has no URL for an item without a thumbnail', () => {
			const { source } = setUp()
			expect(source.resolveThumbnail(itemWith(), context())).toBeNull()
		})
	})
})
