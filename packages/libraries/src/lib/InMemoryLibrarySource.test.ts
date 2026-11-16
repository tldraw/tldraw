import { react } from '@tldraw/state'
import { LibraryRecordType, createShapeId, createTLSchema } from '@tldraw/tlschema'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InMemoryLibrarySource } from './InMemoryLibrarySource'
import {
	LibraryNotFoundError,
	LibraryPermissionError,
	type TLLibraryAction,
	type TLLibraryTarget,
} from './LibrarySource'
import { LibraryItemRecordType, type TLLibraryItem, type TLLibraryItemContent } from './schema'
import { whenItemsStored } from './whenItemsStored'

// An add, once its items are stored as well as listed.
async function added<T extends TLLibraryItem | TLLibraryItem[]>(adding: Promise<T>) {
	const result = await adding
	await whenItemsStored((Array.isArray(result) ? result : [result]).map((item) => item.id))
	return result
}

const shapeId = createShapeId('box')
const pack = LibraryRecordType.createId('pack')
const card = LibraryItemRecordType.createId('card')
const missingLibrary = LibraryRecordType.createId('nope')
const missingItem = LibraryItemRecordType.createId('nope')

const prefabs = () => LibraryRecordType.create({ id: pack, name: 'Prefabs' })
const cardItem = () => LibraryItemRecordType.create({ id: card, libraryId: pack, name: 'Card' })

const png = () => new Blob(['png'], { type: 'image/png' })

function content(): TLLibraryItemContent {
	return {
		formatVersion: 1,
		content: {
			shapes: [{ id: shapeId, type: 'geo', x: 0, y: 0, props: {} }] as any,
			bindings: [],
			rootShapeIds: [shapeId],
			assets: [],
			schema: createTLSchema().serialize(),
		},
	}
}

describe('InMemoryLibrarySource', () => {
	it('creates and renames libraries', async () => {
		const source = new InMemoryLibrarySource()
		const library = await source.createLibrary('Wireframes')
		expect(source.getLibraries()).toEqual([library])

		await source.renameLibrary(library.id, 'Icons')
		expect(source.getLibraries()).toEqual([{ ...library, name: 'Icons' }])
	})

	it('rejects blank library names', async () => {
		const source = new InMemoryLibrarySource()
		const library = await source.createLibrary('Wireframes')
		await expect(source.renameLibrary(library.id, ' ')).rejects.toThrow()
		await expect(source.createLibrary('')).rejects.toThrow()
		expect(source.getLibraries()).toEqual([library])
	})

	it('adds items and serves their content separately from the listing', async () => {
		const source = new InMemoryLibrarySource()
		const library = await source.createLibrary('Wireframes')
		const item = await added(
			source.addItem(library.id, {
				name: 'Card',
				content: content(),
			})
		)

		expect(item).toMatchObject({ libraryId: library.id, name: 'Card', version: 1 })
		expect(source.getItems(library.id)).toEqual([item])
		expect(await source.getItemContent(item.id)).toEqual(content())
	})

	it('adds an item without a name', async () => {
		const source = new InMemoryLibrarySource()
		const library = await source.createLibrary('Wireframes')
		const item = await added(source.addItem(library.id, { content: content() }))
		expect(item.libraryId).toBe(library.id)
		expect(item).not.toHaveProperty('name')
	})

	it('gives each image of a light and dark pair its own url', async () => {
		const source = new InMemoryLibrarySource()
		const library = await source.createLibrary('Wireframes')
		const item = await added(
			source.addItem(library.id, {
				name: 'Card',
				content: content(),
				thumbnail: { light: png(), dark: png() },
			})
		)
		expect(item.thumbnail).toEqual({
			light: expect.stringMatching(/^blob:/),
			dark: expect.stringMatching(/^blob:/),
		})
		const { light, dark } = item.thumbnail as { light: string; dark: string }
		expect(dark).not.toBe(light)
	})

	it('keeps a single thumbnail a single url', async () => {
		const source = new InMemoryLibrarySource()
		const library = await source.createLibrary('Wireframes')
		const item = await added(source.addItem(library.id, { content: content(), thumbnail: png() }))
		expect(item.thumbnail).toMatch(/^blob:/)
	})

	it('renames items and rejects blank names', async () => {
		const source = new InMemoryLibrarySource()
		const library = await source.createLibrary('Wireframes')
		const item = await added(source.addItem(library.id, { name: 'Card', content: content() }))

		await source.renameItem(item.id, 'Header')
		expect(source.getItems(library.id)).toEqual([{ ...item, name: 'Header' }])
		await expect(source.renameItem(item.id, '  ')).rejects.toThrow()
		expect(source.getItems(library.id)).toEqual([{ ...item, name: 'Header' }])
	})

	it('reports a missing item as not found, not as forbidden', async () => {
		const source = new InMemoryLibrarySource({ can: () => false })
		await expect(source.renameItem(missingItem, 'Name')).rejects.toThrow(LibraryNotFoundError)
		await expect(source.deleteItem(missingItem)).rejects.toThrow(LibraryNotFoundError)
	})

	it('adds several items together, in the order given', async () => {
		const source = new InMemoryLibrarySource()
		const library = await source.createLibrary('Wireframes')
		const listings: string[][] = []
		const stop = react('listing', () => {
			listings.push(
				source
					.getItems(library.id)
					.map((item) => item.name ?? '')
					.sort()
			)
		})

		const items = await added(
			source.addItems(library.id, [
				{ name: 'Button', content: content() },
				{ name: 'Card', content: content(), thumbnail: png() },
				{ name: 'Input', content: content() },
			])
		)
		stop()

		expect(items.map((item) => item.name)).toEqual(['Button', 'Card', 'Input'])
		expect(source.getItems(library.id)).toHaveLength(3)
		expect(source.getItems(library.id)).toEqual(expect.arrayContaining(items))
		expect(listings).toEqual([[], ['Button', 'Card', 'Input']])
		expect(items[0].createdAt).toBeLessThan(items[1].createdAt!)
		expect(items[1].createdAt).toBeLessThan(items[2].createdAt!)
		expect(items[1].thumbnail).toMatch(/^blob:/)
		expect(await source.getItemContent(items[2].id)).toEqual(content())
	})

	it('adds none of the items when one is refused', async () => {
		const create = vi.spyOn(URL, 'createObjectURL')
		const source = new InMemoryLibrarySource()
		const library = await source.createLibrary('Wireframes')
		await expect(
			source.addItems(library.id, [
				{ name: 'Button', content: content(), thumbnail: png() },
				{ name: ' ', content: content() },
			])
		).rejects.toThrow()
		expect(source.getItems(library.id)).toEqual([])
		expect(create).not.toHaveBeenCalled()
		create.mockRestore()
	})

	describe('thumbnail urls', () => {
		afterEach(() => vi.restoreAllMocks())

		it('releases the urls when their item is deleted', async () => {
			const revoke = vi.spyOn(URL, 'revokeObjectURL')
			const source = new InMemoryLibrarySource()
			const library = await source.createLibrary('Wireframes')
			const item = await added(
				source.addItem(library.id, {
					content: content(),
					thumbnail: { light: png(), dark: png() },
				})
			)
			await source.deleteItem(item.id)
			const { light, dark } = item.thumbnail as { light: string; dark: string }
			expect(revoke).toHaveBeenCalledWith(light)
			expect(revoke).toHaveBeenCalledWith(dark)
		})

		it('creates no url for an item that fails validation', async () => {
			const create = vi.spyOn(URL, 'createObjectURL')
			const source = new InMemoryLibrarySource()
			const library = await source.createLibrary('Wireframes')
			await expect(
				source.addItem(library.id, {
					name: ' ',
					content: content(),
					thumbnail: { light: png(), dark: png() },
				})
			).rejects.toThrow()
			expect(create).not.toHaveBeenCalled()
		})
	})

	it('deletes items and their content', async () => {
		const source = new InMemoryLibrarySource()
		const library = await source.createLibrary('Wireframes')
		const item = await added(
			source.addItem(library.id, {
				name: 'Card',
				content: content(),
			})
		)

		await source.deleteItem(item.id)
		expect(source.getItems(library.id)).toEqual([])
		await expect(source.getItemContent(item.id)).rejects.toThrow(LibraryNotFoundError)
	})

	it('moves an item to another library, keeping its id and content', async () => {
		const source = new InMemoryLibrarySource()
		const from = await source.createLibrary('Wireframes')
		const to = await source.createLibrary('Icons')
		const item = await added(source.addItem(from.id, { name: 'Card', content: content() }))
		await source.moveItem(item.id, to.id)
		expect(source.getItems(from.id)).toEqual([])
		expect(source.getItems(to.id).map((i) => i.id)).toEqual([item.id])
		expect(await source.getItemContent(item.id)).toEqual(content())
	})

	it('refuses to move an item out of or into a read-only library', async () => {
		const source = new InMemoryLibrarySource({
			initial: { libraries: [prefabs()], items: [], contents: {} },
			can: (_, libraryId) => libraryId !== pack,
		})
		const writable = await source.createLibrary('Mine')
		const item = await added(source.addItem(writable.id, { content: content() }))
		await expect(source.moveItem(item.id, pack)).rejects.toThrow(LibraryPermissionError)
		await expect(source.moveItem(item.id, missingLibrary)).rejects.toThrow(LibraryNotFoundError)
	})

	describe('owners', () => {
		const owners = [
			{ id: 'home', name: 'Personal' },
			{ id: 'acme', name: 'Acme workspace' },
		]

		it('gives new libraries to the first owner', async () => {
			const source = new InMemoryLibrarySource({ owners })
			expect(source.getLibraryOwners()).toEqual(owners)
			const library = await source.createLibrary('Wireframes')
			expect(library.ownerId).toBe('home')
		})

		it('gives new libraries to the default owner, unless they name one', async () => {
			const source = new InMemoryLibrarySource({ owners, defaultOwnerId: 'acme' })
			expect(source.getDefaultOwnerId()).toBe('acme')
			expect((await source.createLibrary('Wireframes')).ownerId).toBe('acme')
			expect((await source.createLibrary('Icons', { ownerId: 'home' })).ownerId).toBe('home')
		})

		it('refuses a new library for a missing owner', async () => {
			const source = new InMemoryLibrarySource({ owners })
			await expect(source.createLibrary('Wireframes', { ownerId: 'nobody' })).rejects.toThrow(
				LibraryNotFoundError
			)
			expect(source.getLibraries()).toEqual([])
		})

		it('lets a subclass list its own owners, checking starting data only against given ones', async () => {
			class WorkspaceSource extends InMemoryLibrarySource {
				override getLibraryOwners() {
					return owners
				}
			}
			const source = new WorkspaceSource({
				initial: { libraries: [{ ...prefabs(), ownerId: 'acme' }], items: [], contents: {} },
			})
			expect((await source.createLibrary('Mine')).ownerId).toBe('home')
			await expect(source.createLibrary('Theirs', { ownerId: 'nobody' })).rejects.toThrow(
				LibraryNotFoundError
			)
		})

		it('refuses a default owner that is not an owner', () => {
			expect(() => new InMemoryLibrarySource({ owners, defaultOwnerId: 'nobody' })).toThrow(
				'not one of the owners'
			)
		})

		it('leaves the owner out without owners', async () => {
			const source = new InMemoryLibrarySource()
			expect(source.getLibraryOwners()).toEqual([])
			expect(source.getDefaultOwnerId()).toBeUndefined()
			const library = await source.createLibrary('Wireframes')
			expect(library.ownerId).toBeUndefined()
		})

		it('moves a library to another owner, keeping its items', async () => {
			const source = new InMemoryLibrarySource({ owners })
			const library = await source.createLibrary('Wireframes')
			const item = await added(source.addItem(library.id, { name: 'Card', content: content() }))
			const seen: (string | undefined)[] = []
			const stop = react('owner', () => {
				seen.push(source.getLibraries()[0].ownerId)
			})
			const moved = await source.moveLibrary(library.id, 'acme')
			stop()
			expect(moved).toEqual({ ...library, ownerId: 'acme' })
			expect(seen).toEqual(['home', 'acme'])
			expect(source.getLibraries()).toEqual([{ ...library, ownerId: 'acme' }])
			expect(source.getItems(library.id).map((i) => i.id)).toEqual([item.id])
			expect(await source.getItemContent(item.id)).toEqual(content())
		})

		it('refuses a missing library or owner', async () => {
			const source = new InMemoryLibrarySource({ owners })
			const library = await source.createLibrary('Wireframes')
			await expect(source.moveLibrary(missingLibrary, 'acme')).rejects.toThrow(LibraryNotFoundError)
			await expect(source.moveLibrary(library.id, 'nobody')).rejects.toThrow(LibraryNotFoundError)
			expect(source.getLibraries()[0].ownerId).toBe('home')
		})

		it('refuses starting data owned by a missing owner', () => {
			expect(
				() =>
					new InMemoryLibrarySource({
						owners,
						initial: {
							libraries: [{ ...prefabs(), ownerId: 'nobody' }],
							items: [],
							contents: {},
						},
					})
			).toThrow('missing owner')
		})
	})

	it('deleting a library deletes its items', async () => {
		const source = new InMemoryLibrarySource()
		const keep = await source.createLibrary('Keep')
		const drop = await source.createLibrary('Drop')
		const kept = await added(source.addItem(keep.id, { name: 'A', content: content() }))
		const dropped = await added(
			source.addItem(drop.id, {
				name: 'B',
				content: content(),
			})
		)

		await source.deleteLibrary(drop.id)
		expect(source.getLibraries()).toEqual([keep])
		expect(source.getItems(keep.id)).toEqual([kept])
		await expect(source.getItemContent(dropped.id)).rejects.toThrow(LibraryNotFoundError)
	})

	it('reports a missing library as not found, not as forbidden', async () => {
		const source = new InMemoryLibrarySource()
		await expect(source.renameLibrary(missingLibrary, 'Name')).rejects.toThrow(LibraryNotFoundError)
		await expect(source.addItem(missingLibrary, { name: 'A', content: content() })).rejects.toThrow(
			LibraryNotFoundError
		)
	})

	it('allows everything by default', () => {
		const source = new InMemoryLibrarySource({
			initial: { libraries: [prefabs()], items: [], contents: {} },
		})
		expect(source.can('createLibrary')).toBe(true)
		expect(source.can('addItem', pack)).toBe(true)
		expect(source.can('deleteLibrary', pack)).toBe(true)
	})

	it('answers no for a library that does not exist, without asking the rule', () => {
		const can = vi.fn(() => true)
		const source = new InMemoryLibrarySource({ can })
		expect(source.can('addItem', missingLibrary)).toBe(false)
		expect(can).not.toHaveBeenCalled()
	})

	it('answers no for an owner it does not list, without asking the rule', () => {
		const can = vi.fn(() => true)
		const source = new InMemoryLibrarySource({ owners: [{ id: 'home', name: 'Home' }], can })
		expect(source.can('createLibrary', { ownerId: 'nobody' })).toBe(false)
		expect(can).not.toHaveBeenCalled()
	})

	it('asks the rule about new libraries for an owner', async () => {
		const can = vi.fn(
			(_: TLLibraryAction, target?: TLLibraryTarget) =>
				typeof target !== 'object' || target.ownerId !== 'acme'
		)
		const source = new InMemoryLibrarySource({
			owners: [
				{ id: 'home', name: 'Home' },
				{ id: 'acme', name: 'Acme' },
			],
			can,
		})
		expect(source.can('createLibrary', { ownerId: 'home' })).toBe(true)
		expect(source.can('createLibrary', { ownerId: 'acme' })).toBe(false)
		expect(can).toHaveBeenCalledWith('createLibrary', { ownerId: 'acme' })
		expect((await source.createLibrary('Mine')).ownerId).toBe('home')
		await expect(source.createLibrary('Theirs', { ownerId: 'acme' })).rejects.toThrow(
			LibraryPermissionError
		)
	})

	it('refuses every write when read-only, but items stay usable', async () => {
		const source = new InMemoryLibrarySource({
			can: () => false,
			initial: {
				libraries: [prefabs()],
				items: [cardItem()],
				contents: { [card]: content() },
			},
		})
		expect(source.can('createLibrary')).toBe(false)
		expect(source.can('addItem', pack)).toBe(false)
		await expect(source.createLibrary('New')).rejects.toThrow(LibraryPermissionError)
		await expect(source.deleteItem(card)).rejects.toThrow(LibraryPermissionError)
		await expect(source.renameItem(card, 'New')).rejects.toThrow(LibraryPermissionError)
		await expect(source.deleteLibrary(pack)).rejects.toThrow(LibraryPermissionError)
		expect(await source.getItemContent(card)).toEqual(content())
	})

	it('refuses writes to a read-only library in a writable source', async () => {
		const source = new InMemoryLibrarySource({
			initial: {
				libraries: [prefabs()],
				items: [],
				contents: {},
			},
			can: (_, libraryId) => libraryId !== pack,
		})
		expect(source.can('createLibrary')).toBe(true)
		expect(source.can('addItem', pack)).toBe(false)
		await expect(source.addItem(pack, { name: 'A', content: content() })).rejects.toThrow(
			LibraryPermissionError
		)
	})

	it('rejects starting data with items that have no library or no content', () => {
		const item = cardItem()
		expect(
			() =>
				new InMemoryLibrarySource({
					initial: { libraries: [], items: [item], contents: { [card]: content() } },
				})
		).toThrow(/missing library/)
		expect(
			() =>
				new InMemoryLibrarySource({
					initial: { libraries: [prefabs()], items: [item], contents: {} },
				})
		).toThrow(/no content/)
	})

	it('validates starting data', () => {
		expect(
			() =>
				new InMemoryLibrarySource({
					initial: {
						libraries: [{ ...prefabs(), name: '' }],
						items: [],
						contents: {},
					},
				})
		).toThrow()
	})

	it('updates reactive readers when libraries change', async () => {
		const source = new InMemoryLibrarySource()
		const seen: string[][] = []
		const stop = react('names', () => {
			seen.push(source.getLibraries().map((c) => c.name))
		})

		const library = await source.createLibrary('Wireframes')
		await source.renameLibrary(library.id, 'Icons')
		stop()

		expect(seen).toEqual([[], ['Wireframes'], ['Icons']])
	})
	it('only re-runs a listing when its own library changes', async () => {
		const source = new InMemoryLibrarySource()
		const a = await source.createLibrary('A')
		const b = await source.createLibrary('B')
		let runs = 0
		const stop = react('listing a', () => {
			source.getItems(a.id)
			runs++
		})

		await added(source.addItem(b.id, { name: 'In B', content: content() }))
		expect(runs).toBe(1)
		await added(source.addItem(a.id, { name: 'In A', content: content() }))
		expect(runs).toBe(2)
		stop()
	})

	it('rejects starting data with content no item lists, or duplicate ids', () => {
		const library = prefabs()
		const item = cardItem()
		const orphan = LibraryItemRecordType.createId('orphan')
		expect(
			() =>
				new InMemoryLibrarySource({
					initial: {
						libraries: [library],
						items: [item],
						contents: { [card]: content(), [orphan]: content() },
					},
				})
		).toThrow(/orphan has no item/)
		expect(
			() =>
				new InMemoryLibrarySource({
					initial: { libraries: [library, library], items: [], contents: {} },
				})
		).toThrow(/Duplicate ids/)
		expect(
			() =>
				new InMemoryLibrarySource({
					initial: {
						libraries: [library],
						items: [item, item],
						contents: { [card]: content() },
					},
				})
		).toThrow(/Duplicate ids/)
	})

	it('keeps its own copy of item content', async () => {
		const source = new InMemoryLibrarySource()
		const library = await source.createLibrary('Wireframes')
		const passed = content()
		const item = await added(source.addItem(library.id, { content: passed }))

		passed.content.rootShapeIds.length = 0
		const loaded = await source.getItemContent(item.id)
		loaded.content.shapes.length = 0

		expect(await source.getItemContent(item.id)).toEqual(content())
	})

	it('releases every thumbnail url on dispose', async () => {
		const revoke = vi.spyOn(URL, 'revokeObjectURL')
		const source = new InMemoryLibrarySource()
		const library = await source.createLibrary('Wireframes')
		const item = await added(
			source.addItem(library.id, {
				content: content(),
				thumbnail: { light: png(), dark: png() },
			})
		)
		source.dispose()
		const { light, dark } = item.thumbnail as { light: string; dark: string }
		expect(revoke).toHaveBeenCalledWith(light)
		expect(revoke).toHaveBeenCalledWith(dark)
		revoke.mockRestore()
	})
})
