import { MAX_LIBRARY_NAME_LENGTH, ZErrorCode } from '@tldraw/dotcom-shared'
import {
	LibraryItemRecordType,
	LibraryPermissionError,
	LibraryRecordType,
	copyLibrary,
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

function setUp() {
	const backend = createFakeLibrariesBackend()
	vi.stubGlobal('fetch', backend.fetch)
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
		expect(item.thumbnail).toBe('https://content.test/thumbnail-1-png')
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
		expect(item.thumbnail).toEqual(pair)
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
