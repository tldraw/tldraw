import { LibraryPermissionError, LibraryRecordType, type TLLibrary } from '@tldraw/libraries'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createFakeLibrariesBackend } from './fakeLibrariesBackend'
import { TldrawAppFileLibrariesSource } from './fileLibrariesSource'
import { TldrawAppLibrariesSource } from './librariesSource'

const rowId = (library: TLLibrary) => library.id.slice('library:'.length)

const names = (libraries: TLLibrary[]) => libraries.map((library) => library.name)

function setUp({ workspaces = ['acme'] }: { workspaces?: string[] } = {}) {
	const backend = createFakeLibrariesBackend({
		workspaces: workspaces.map((id) => ({ id, name: id[0].toUpperCase() + id.slice(1) })),
	})
	vi.stubGlobal('fetch', backend.fetch)
	const libraries = new TldrawAppLibrariesSource(backend.app, backend.getToken)
	const source = new TldrawAppFileLibrariesSource(backend.app, libraries, 'file-a')
	return { backend, libraries, source }
}

afterEach(() => {
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
})

describe('TldrawAppFileLibrariesSource', () => {
	it("shows the user's default and the libraries added to the file, and offers the rest", async () => {
		const { backend, libraries, source } = setUp()
		libraries.ensureDefaultLibrary()
		const kit = await libraries.createLibrary('Kit', { ownerId: 'acme' })
		const other = await libraries.createLibrary('Other', { ownerId: 'acme' })
		backend.fileLibraries.set([
			{ fileId: 'file-a', libraryId: rowId(kit), addedBy: 'x', addedAt: 0 },
		])
		expect(names(source.getLibraries())).toEqual(['My stuff', 'Kit'])
		const [mine] = source.getLibraries()
		expect(source.getLibraryPlacement(mine.id)).toBe('default')
		expect(source.getLibraryPlacement(kit.id)).toBe('added')
		expect(source.getLibraryPlacement(other.id)).toBeUndefined()
		expect(names(source.getAvailableLibraries())).toEqual(['Other'])
	})

	it("offers only the file's workspace, for adding libraries and new ones", async () => {
		const { backend, libraries, source } = setUp({ workspaces: ['acme', 'beta'] })
		const kit = await libraries.createLibrary('Kit', { ownerId: 'acme' })
		const mine = await libraries.createLibrary('Mine')
		const beta = await libraries.createLibrary('Beta kit', { ownerId: 'beta' })
		expect(source.getNewLibraryOwnerIds()).toEqual(['acme'])
		expect(source.getDefaultOwnerId()).toBe('acme')
		expect(names(source.getAvailableLibraries())).toEqual(['Kit'])
		expect(source.can('addLibraryToDocument', mine.id)).toBe(false)
		expect(source.can('addLibraryToDocument', beta.id)).toBe(false)
		await expect(source.addLibraryToDocument(beta.id)).rejects.toThrow(LibraryPermissionError)

		backend.fileWorkspaces.set(new Map([['file-a', 'user_me']]))
		expect(source.getNewLibraryOwnerIds()).toEqual(['user_me'])
		expect(names(source.getAvailableLibraries())).toEqual(['Mine'])
		expect(source.can('addLibraryToDocument', kit.id)).toBe(false)
		expect(source.can('addLibraryToDocument', mine.id)).toBe(true)
	})

	it('adds libraries to the file and removes them again', async () => {
		const { libraries, source } = setUp()
		const kit = await libraries.createLibrary('Kit', { ownerId: 'acme' })
		expect(source.can('addLibraryToDocument', kit.id)).toBe(true)
		expect(source.can('removeLibraryFromDocument', kit.id)).toBe(false)
		await source.addLibraryToDocument(kit.id)
		expect(names(source.getLibraries())).toEqual(['Kit'])
		expect(source.getLibraryPlacement(kit.id)).toBe('added')
		expect(source.getAvailableLibraries()).toEqual([])
		await source.removeLibraryFromDocument(kit.id)
		expect(source.getLibraries()).toEqual([])
		expect(names(source.getAvailableLibraries())).toEqual(['Kit'])
	})

	it("doesn't remove the user's default", async () => {
		const { libraries, source } = setUp()
		libraries.ensureDefaultLibrary()
		const [mine] = source.getLibraries()
		expect(source.can('removeLibraryFromDocument', mine.id)).toBe(false)
		await expect(source.removeLibraryFromDocument(mine.id)).rejects.toThrow(LibraryPermissionError)
	})

	it('adds a library it creates to the file', async () => {
		const { backend, source } = setUp()
		const kit = await source.createLibrary('Kit')
		expect(source.getLibraries()).toEqual([kit])
		expect(source.getLibraryPlacement(kit.id)).toBe('added')
		expect(backend.fileLibraries.get()).toMatchObject([{ fileId: 'file-a', libraryId: rowId(kit) }])
	})

	it('shows a copy while it is copied, and adds it once its row arrives', async () => {
		const { backend, libraries, source } = setUp()
		const kit = await libraries.createLibrary('Kit', { ownerId: 'acme' })
		const rows = backend.holdWorkerRows()
		const copying = source.copyLibrary(kit.id, 'user_me')
		await vi.waitFor(() => expect(names(source.getLibraries())).toEqual(['Kit']))
		expect(backend.fileLibraries.get()).toEqual([])
		rows.release()
		const copy = await copying
		expect(source.getLibraries()).toMatchObject([{ id: copy.id, ownerId: 'user_me' }])
		expect(backend.fileLibraries.get()).toMatchObject([{ libraryId: rowId(copy) }])
	})

	it("lets someone who can't edit the file use its libraries, but not add, remove or create", async () => {
		const { backend, libraries, source } = setUp()
		const kit = await libraries.createLibrary('Kit', { ownerId: 'acme' })
		const other = await libraries.createLibrary('Other', { ownerId: 'acme' })
		await source.addLibraryToDocument(kit.id)
		backend.readOnlyFiles.add('file-a')
		expect(source.can('addItem', kit.id)).toBe(true)
		expect(source.can('removeLibraryFromDocument', kit.id)).toBe(false)
		expect(source.can('addLibraryToDocument', other.id)).toBe(false)
		expect(source.can('createLibrary')).toBe(false)
		await expect(source.addLibraryToDocument(other.id)).rejects.toThrow(LibraryPermissionError)
		await expect(source.createLibrary('New')).rejects.toThrow(LibraryPermissionError)
	})

	it("shows a library from a workspace the user isn't in, with its items, read-only", () => {
		const { backend, source } = setUp()
		backend.otherRows.set([
			{
				id: 'theirs',
				name: 'Their kit',
				owningGroupId: 'elsewhere',
				meta: {},
				isDefault: false,
				createdBy: 'someone',
				createdAt: 0,
				updatedAt: 0,
				items: [
					{
						id: 'star',
						libraryId: 'theirs',
						name: 'Star',
						thumbnail: 'https://content.test/star.png',
						createdBy: 'someone',
						createdAt: 0,
						updatedAt: 0,
						meta: {},
					},
				],
			},
		])
		backend.fileLibraries.set([
			{ fileId: 'file-a', libraryId: 'theirs', addedBy: 'someone', addedAt: 0 },
		])
		const theirs = LibraryRecordType.createId('theirs')
		expect(source.getLibraries()).toMatchObject([{ id: theirs, ownerId: 'elsewhere' }])
		expect(source.getLibraryPlacement(theirs)).toBe('added')
		expect(source.getItems(theirs)).toMatchObject([
			{ name: 'Star', thumbnail: 'https://content.test/star.png' },
		])
		for (const action of ['addItem', 'renameLibrary', 'deleteLibrary'] as const) {
			expect(source.can(action, theirs)).toBe(false)
		}
		expect(source.can('removeLibraryFromDocument', theirs)).toBe(true)
	})
})
