import { react } from '@tldraw/state'
import {
	LibraryRecordType,
	createShapeId,
	createTLSchema,
	type TLLibraryId,
	type TLLibraryItemId,
} from '@tldraw/tlschema'
import { describe, expect, it, vi } from 'vitest'
import { CompositeLibrarySource } from './CompositeLibrarySource'
import { copyLibrary } from './copyLibrary'
import { InMemoryLibrarySource } from './InMemoryLibrarySource'
import {
	LibraryNotFoundError,
	LibraryPermissionError,
	type LibrarySource,
	type TLNewLibraryItem,
} from './LibrarySource'
import { LibraryItemRecordType, type TLLibraryItem, type TLLibraryItemContent } from './schema'
import { trackItemsStoring, whenItemsStored } from './whenItemsStored'

// An add, once its items are stored as well as listed.
async function added<T extends TLLibraryItem | TLLibraryItem[]>(adding: Promise<T>) {
	const result = await adding
	await whenItemsStored((Array.isArray(result) ? result : [result]).map((item) => item.id))
	return result
}

function content(name: string): TLLibraryItemContent {
	const id = createShapeId(name)
	return {
		formatVersion: 1,
		content: {
			shapes: [{ id, type: 'geo', x: 0, y: 0, props: {} }] as any,
			bindings: [],
			rootShapeIds: [id],
			assets: [],
			schema: createTLSchema().serialize(),
		},
	}
}

// The source as one written without addItems would be.
const withoutAddItems = (source: LibrarySource): LibrarySource =>
	new Proxy(source, {
		get: (target, key) => {
			if (key === 'addItems') return undefined
			const value = Reflect.get(target, key)
			return typeof value === 'function' ? value.bind(target) : value
		},
	})

const tldraw = { id: 'tldraw', name: 'tldraw' }
const personal = { id: 'home', name: 'Personal' }
const acme = { id: 'acme', name: 'Acme workspace' }

const wireframing = LibraryRecordType.createId('wireframing')

// A read-only part, as a host's shared kits might be.
const shared = () => {
	const button = LibraryItemRecordType.create({ libraryId: wireframing, name: 'Button' })
	const card = LibraryItemRecordType.create({ libraryId: wireframing, name: 'Card' })
	return new InMemoryLibrarySource({
		can: () => false,
		initial: {
			libraries: [LibraryRecordType.create({ id: wireframing, name: 'Wireframing' })],
			items: [button, card],
			contents: { [button.id]: content('button'), [card.id]: content('card') },
		},
	})
}

function setUp() {
	const mine = new InMemoryLibrarySource({ id: 'mine' })
	const team = new InMemoryLibrarySource({ id: 'team' })
	const kits = shared()
	const source = new CompositeLibrarySource({
		parts: [
			{ owner: personal, source: mine },
			{ owner: acme, source: team },
			{ owner: tldraw, source: kits },
		],
	})
	return { source, mine, team, kits }
}

describe('CompositeLibrarySource', () => {
	it('lists one owner per part', () => {
		const { source } = setUp()
		expect(source.getLibraryOwners()).toEqual([personal, acme, tldraw])
	})

	it("lists every part's libraries, each owned by its part, without changing the parts'", async () => {
		const { source, mine } = setUp()
		const kit = await mine.createLibrary('Kit')
		expect(source.getLibraries().map((c) => [c.name, c.ownerId])).toEqual([
			['Kit', 'home'],
			['Wireframing', 'tldraw'],
		])
		expect(mine.getLibraries()).toEqual([kit])
		expect(kit).not.toHaveProperty('ownerId')
	})

	it('updates its listing when a part changes', async () => {
		const { source, team } = setUp()
		const seen: string[][] = []
		const stop = react('names', () => {
			seen.push(source.getLibraries().map((c) => c.name))
		})
		await team.createLibrary('Team kit')
		stop()
		expect(seen.at(-1)).toEqual(['Team kit', 'Wireframing'])
	})

	it('routes reads and writes to the part holding the library or item', async () => {
		const { source, team } = setUp()
		const kit = await source.createLibrary('Kit', { ownerId: 'acme' })
		expect(team.getLibraries().map((c) => c.id)).toEqual([kit.id])
		const item = await added(source.addItem(kit.id, { name: 'Star', content: content('star') }))
		expect(source.getItems(kit.id)).toEqual(team.getItems(kit.id))
		expect(await source.getItemContent(item.id)).toEqual(content('star'))
		await source.renameItem(item.id, 'Heart')
		expect(team.getItems(kit.id)[0].name).toBe('Heart')
		await source.renameLibrary(kit.id, 'Icons')
		expect(team.getLibraries()[0].name).toBe('Icons')
		await source.deleteItem(item.id)
		await source.deleteLibrary(kit.id)
		expect(team.getLibraries()).toEqual([])

		const [button] = source.getItems(wireframing)
		expect(await source.getItemContent(button.id)).toEqual(content('button'))
	})

	it('adds several items through the part holding the library, together where it can', async () => {
		const { source, team } = setUp()
		const kit = await source.createLibrary('Kit', { ownerId: 'acme' })
		const addItems = vi.spyOn(team, 'addItems')
		const items = await added(
			source.addItems(kit.id, [
				{ name: 'Star', content: content('star') },
				{ name: 'Heart', content: content('heart') },
			])
		)
		expect(addItems).toHaveBeenCalledTimes(1)
		expect(items.map((item) => item.name)).toEqual(['Star', 'Heart'])
		expect(team.getItems(kit.id)).toEqual(expect.arrayContaining(items))
	})

	it('adds several items one at a time to a part without addItems', async () => {
		const mine = new InMemoryLibrarySource({ id: 'mine' })
		const addItem = vi.spyOn(mine, 'addItem')
		const source = new CompositeLibrarySource({
			parts: [{ owner: personal, source: withoutAddItems(mine) }],
		})
		const kit = await source.createLibrary('Kit')
		const items = await added(
			source.addItems(kit.id, [
				{ name: 'Star', content: content('star') },
				{ name: 'Heart', content: content('heart') },
			])
		)
		expect(addItem).toHaveBeenCalledTimes(2)
		expect(items.map((item) => item.name)).toEqual(['Star', 'Heart'])
	})

	it('delegates permissions to the part', () => {
		const { source } = setUp()
		expect(source.can('createLibrary')).toBe(true)
		expect(source.can('renameLibrary', wireframing)).toBe(false)
		expect(source.can('addItem', wireframing)).toBe(false)
	})

	it('answers for an owner from its part', () => {
		const { source } = setUp()
		expect(source.can('createLibrary', { ownerId: 'acme' })).toBe(true)
		expect(source.can('createLibrary', { ownerId: 'tldraw' })).toBe(false)
		expect(source.can('createLibrary', { ownerId: 'nobody' })).toBe(false)
	})

	it('passes the owner to a part that lists its own owners', () => {
		const can = vi.fn(() => true)
		const workspaces = new InMemoryLibrarySource({ owners: [personal, acme], can })
		const source = new CompositeLibrarySource({
			parts: [{ source: workspaces }, { owner: tldraw, source: shared() }],
		})
		expect(source.can('createLibrary', { ownerId: 'acme' })).toBe(true)
		expect(can).toHaveBeenCalledWith('createLibrary', { ownerId: 'acme' })
	})

	it('creates libraries in the default part, or the part of the owner they name', async () => {
		const { source, mine, team } = setUp()
		expect(source.getDefaultOwnerId()).toBe('home')
		const kit = await source.createLibrary('Kit')
		expect(kit.ownerId).toBe('home')
		expect(mine.getLibraries()).toHaveLength(1)
		await source.createLibrary('Team kit', { ownerId: 'acme' })
		expect(team.getLibraries()).toHaveLength(1)
		await expect(source.createLibrary('Nope', { ownerId: 'nobody' })).rejects.toThrow(
			LibraryNotFoundError
		)
		await expect(source.createLibrary('Nope', { ownerId: 'tldraw' })).rejects.toThrow(
			LibraryPermissionError
		)
	})

	it('keeps the meta it is given, in parts with or without their own owners', async () => {
		const { source } = setUp()
		const kit = await source.createLibrary('Kit', { meta: { packId: 'p' } })
		expect(source.getLibraries().find((c) => c.id === kit.id)?.meta).toEqual({ packId: 'p' })
		const teamKit = await source.createLibrary('Team kit', {
			ownerId: 'acme',
			meta: { packId: 'q' },
		})
		expect(source.getLibraries().find((c) => c.id === teamKit.id)?.meta).toEqual({ packId: 'q' })
	})

	it('takes a default owner from the options', async () => {
		const mine = new InMemoryLibrarySource()
		const team = new InMemoryLibrarySource()
		const source = new CompositeLibrarySource({
			parts: [
				{ owner: personal, source: mine },
				{ owner: acme, source: team },
			],
			defaultOwnerId: 'acme',
		})
		expect((await source.createLibrary('Kit')).ownerId).toBe('acme')
		expect(team.getLibraries()).toHaveLength(1)
	})

	it("won't move a library out of a read-only part, and copies nothing", async () => {
		const { source, mine, kits } = setUp()
		await expect(source.moveLibrary(wireframing, 'home')).rejects.toThrow(LibraryPermissionError)
		expect(mine.getLibraries()).toEqual([])
		expect(kits.getLibraries()).toHaveLength(1)
	})

	it("copies a read-only part's library into a writable part, leaving the original", async () => {
		const { source, mine, kits } = setUp()
		await copyLibrary(source, wireframing, 'home')
		const [copy] = mine.getLibraries()
		expect(copy.name).toBe('Wireframing')
		expect(mine.getItems(copy.id).map((item) => item.name)).toEqual(['Button', 'Card'])
		const [button] = mine.getItems(copy.id)
		expect(await mine.getItemContent(button.id)).toEqual(content('button'))
		expect(kits.getLibraries()).toHaveLength(1)
		expect(kits.getItems(wireframing)).toHaveLength(2)
		expect(source.getLibraries().map((c) => [c.name, c.ownerId])).toEqual([
			['Wireframing', 'home'],
			['Wireframing', 'tldraw'],
		])
	})

	it('moves a library between writable parts', async () => {
		const { source, mine, team } = setUp()
		const kit = await source.createLibrary('Kit', { ownerId: 'home' })
		await added(source.addItem(kit.id, { name: 'Star', content: content('star') }))
		await source.moveLibrary(kit.id, 'acme')
		expect(mine.getLibraries()).toEqual([])
		const [moved] = team.getLibraries()
		expect(moved.name).toBe('Kit')
		expect(team.getItems(moved.id).map((item) => item.name)).toEqual(['Star'])
	})

	it('moves an item between parts by copying it and deleting the original', async () => {
		const { source, mine, team } = setUp()
		const from = await source.createLibrary('Kit', { ownerId: 'home' })
		const to = await source.createLibrary('Team kit', { ownerId: 'acme' })
		const item = await added(source.addItem(from.id, { name: 'Star', content: content('star') }))
		await source.moveItem!(item.id, to.id)
		expect(mine.getItems(from.id)).toEqual([])
		expect(team.getItems(to.id).map((i) => i.name)).toEqual(['Star'])
	})

	describe('a part that stores added items after listing them', () => {
		// Lists added items at once, then fails to store them and removes them again.
		function failingToStore(source: InMemoryLibrarySource): LibrarySource {
			const failToStore = (itemIds: TLLibraryItemId[]) => {
				const stored = (async () => {
					await new Promise((resolve) => setTimeout(resolve, 1))
					for (const itemId of itemIds) await source.deleteItem(itemId)
					throw new Error('storing failed')
				})()
				trackItemsStoring(itemIds, stored)
			}
			return new Proxy(source, {
				get: (target, key) => {
					if (key === 'addItem') {
						return async (libraryId: TLLibraryId, newItem: TLNewLibraryItem) => {
							const item = await target.addItem(libraryId, newItem)
							failToStore([item.id])
							return item
						}
					}
					if (key === 'addItems') {
						return async (libraryId: TLLibraryId, newItems: TLNewLibraryItem[]) => {
							const items = await target.addItems(libraryId, newItems)
							failToStore(items.map((item) => item.id))
							return items
						}
					}
					const value = Reflect.get(target, key)
					return typeof value === 'function' ? value.bind(target) : value
				},
			})
		}

		function setUpFailing() {
			const mine = new InMemoryLibrarySource({ id: 'mine' })
			const team = new InMemoryLibrarySource({ id: 'team' })
			const source = new CompositeLibrarySource({
				parts: [
					{ owner: personal, source: mine },
					{ owner: acme, source: failingToStore(team) },
				],
			})
			return { source, mine, team }
		}

		it('resolves an add to the part once listed, while the part goes on storing it', async () => {
			const { source, team } = setUpFailing()
			const kit = await source.createLibrary('Team kit', { ownerId: 'acme' })
			const item = await source.addItem(kit.id, { content: content('star') })
			expect(team.getItems(kit.id)).toEqual([item])
			await expect(whenItemsStored([item.id])).rejects.toThrow('storing failed')
			expect(team.getItems(kit.id)).toEqual([])
		})

		it('keeps an item it failed to move', async () => {
			const { source, mine, team } = setUpFailing()
			const from = await source.createLibrary('Kit', { ownerId: 'home' })
			const to = await source.createLibrary('Team kit', { ownerId: 'acme' })
			const item = await added(source.addItem(from.id, { name: 'Star', content: content('star') }))
			await expect(source.moveItem!(item.id, to.id)).rejects.toThrow('storing failed')
			expect(mine.getItems(from.id).map((i) => i.name)).toEqual(['Star'])
			expect(team.getItems(to.id)).toEqual([])
		})

		it('deletes a copy it failed to store, and keeps a library it failed to move', async () => {
			const { source, mine, team } = setUpFailing()
			const kit = await source.createLibrary('Kit', { ownerId: 'home' })
			await added(source.addItem(kit.id, { name: 'Star', content: content('star') }))
			await expect(copyLibrary(source, kit.id, 'acme')).rejects.toThrow('storing failed')
			await expect(source.moveLibrary(kit.id, 'acme')).rejects.toThrow('storing failed')
			expect(team.getLibraries()).toEqual([])
			expect(mine.getItems(kit.id).map((i) => i.name)).toEqual(['Star'])
		})
	})

	describe('a part that lists its own owners', () => {
		function setUpOwned() {
			const mine = new InMemoryLibrarySource({
				owners: [personal, acme],
				defaultOwnerId: 'acme',
			})
			const source = new CompositeLibrarySource({
				parts: [{ source: mine }, { owner: tldraw, source: shared() }],
			})
			return { source, mine }
		}

		it("lists the part's owners and keeps its libraries' owners", async () => {
			const { source, mine } = setUpOwned()
			await mine.createLibrary('Kit', { ownerId: 'home' })
			expect(source.getLibraryOwners().map((owner) => owner.id)).toEqual(['home', 'acme', 'tldraw'])
			expect(source.getLibraries().map((c) => c.ownerId)).toEqual(['home', 'tldraw'])
		})

		it("uses the part's default owner and routes its owners to it", async () => {
			const { source, mine } = setUpOwned()
			expect(source.getDefaultOwnerId()).toBe('acme')
			const kit = await source.createLibrary('Kit')
			expect(kit.ownerId).toBe('acme')
			await source.moveLibrary(kit.id, 'home')
			expect(mine.getLibraries()[0]).toMatchObject({ id: kit.id, ownerId: 'home' })
		})

		it("won't move a read-only part's library to one of its owners", async () => {
			const { source, mine } = setUpOwned()
			await expect(source.moveLibrary(wireframing, 'home')).rejects.toThrow(LibraryPermissionError)
			expect(mine.getLibraries()).toEqual([])
		})

		it("copies a read-only part's library to one of its owners", async () => {
			const { source, mine } = setUpOwned()
			await copyLibrary(source, wireframing, 'home')
			expect(mine.getLibraries()).toMatchObject([{ name: 'Wireframing', ownerId: 'home' }])
		})
	})

	it('offers moving items only when a part can', () => {
		const withMoving = setUp().source
		expect(withMoving.moveItem).toBeDefined()
		const unmovable = Object.assign(shared(), { moveItem: undefined })
		const withoutMoving = new CompositeLibrarySource({
			parts: [{ owner: tldraw, source: unmovable }],
		})
		expect(withoutMoving.moveItem).toBeUndefined()
	})
})

describe('copyLibrary', () => {
	// A part listing its own owners, which copies libraries itself, as a server-backed source does.
	function setUpWithCopyingPart() {
		const copies: [string, string][] = []
		class CopyingSource extends InMemoryLibrarySource {
			async copyLibrary(libraryId: TLLibraryId, ownerId: string) {
				copies.push([libraryId, ownerId])
				return this.createLibrary('Server copy', { ownerId })
			}
		}
		const workspaces = new CopyingSource({ id: 'workspaces', owners: [personal, acme] })
		const source = new CompositeLibrarySource({
			parts: [{ source: workspaces }, { owner: tldraw, source: shared() }],
		})
		return { source, workspaces, copies }
	}

	it("lets a part's own copyLibrary copy within that part", async () => {
		const { source, copies } = setUpWithCopyingPart()
		const kit = await source.createLibrary('Kit', { ownerId: 'home' })
		const copy = await copyLibrary(source, kit.id, 'acme')
		expect(copies).toEqual([[kit.id, 'acme']])
		expect(copy.name).toBe('Server copy')
	})

	it('copies the items from another part', async () => {
		const { source, workspaces, copies } = setUpWithCopyingPart()
		const copy = await copyLibrary(source, wireframing, 'home')
		expect(copies).toEqual([])
		expect(workspaces.getItems(copy.id).map((item) => item.name)).toEqual(['Button', 'Card'])
	})
})
